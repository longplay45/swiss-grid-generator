#!/usr/bin/env python3
"""
deploy.py

Does:
1) Connect via SFTP to configured FTP host
2) Delete all files/subdirs inside:
   configured remote directory
3) Upload all files from:
   configured local directory
   to the remote directory above

Environment defaults (recommended via `source .env`):
  FTP_DOMAIN
  FTP_USER
  FTP_PASS
  FTP_REMOTE_ROOT
  FTP_LOCAL_ROOT

Usage examples:
  # use .env values
  source .env && python3 deploy.py

  # override user and use key auth
  python3 deploy.py --user i --key ~/.ssh/id_ed25519

  # specify host/port explicitly
  python3 deploy.py --host lp45.net --port 22 --user i

  # dry run (no changes)
  python3 deploy.py --dry-run
"""

from __future__ import annotations

import argparse
import fnmatch
import getpass
import os
import posixpath
import re
import stat
import subprocess
import sys
from typing import Iterable, List, Optional, Tuple

try:
    import paramiko
except ImportError:
    print("Missing dependency: paramiko\nInstall with: python3 -m pip install paramiko", file=sys.stderr)
    sys.exit(1)


def load_env_file(path: str = ".env") -> None:
    """
    Load simple KEY=VALUE or `export KEY=VALUE` pairs into os.environ.
    Existing environment variables are not overridden.
    """
    if not os.path.isfile(path):
        return
    line_pattern = re.compile(r"^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$")
    with open(path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            match = line_pattern.match(line)
            if not match:
                continue
            key, raw_value = match.groups()
            value = raw_value.strip()
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            if key not in os.environ:
                os.environ[key] = value


load_env_file()

HOST = os.getenv("FTP_DOMAIN", "lp45.net")
REMOTE_ROOT = os.getenv("FTP_REMOTE_ROOT", "/preview.swissgridgenerator.com/httpdocs")
LOCAL_ROOT = os.getenv("FTP_LOCAL_ROOT", "/Users/i/Docs/Dev/swiss-grid-generator/webapp/out")
WEBAPP_DIR = os.getenv("FTP_WEBAPP_DIR", "/Users/i/Docs/Dev/swiss-grid-generator/webapp")
DEFAULT_USER = os.getenv("FTP_USER")
DEFAULT_PASSWORD = os.getenv("FTP_PASS")

# Common deploy excludes; edit as needed.
EXCLUDE_GLOBS = [
    ".git",
    ".git/*",
    ".DS_Store",
    "**/.DS_Store",
    "node_modules",
    "node_modules/*",
    "**/node_modules",
    "**/node_modules/*",
    "dist",
    "dist/*",
    "**/dist",
    "**/dist/*",
    "__pycache__",
    "**/__pycache__",
    "*.pyc",
]


def _to_posix(rel_path: str) -> str:
    return rel_path.replace(os.sep, "/").lstrip("/")


def _is_excluded(rel_posix: str, patterns: List[str]) -> bool:
    # Support simple "**/" patterns by checking both raw and basename-ish matches.
    for pat in patterns:
        pat_norm = pat.replace(os.sep, "/")
        if fnmatch.fnmatch(rel_posix, pat_norm):
            return True
        # If pattern contains no slash, match against any path segment
        if "/" not in pat_norm and fnmatch.fnmatch(posixpath.basename(rel_posix), pat_norm):
            return True
    return False


def connect_sftp(
    host: str,
    port: int,
    username: str,
    password: Optional[str],
    key_path: Optional[str],
    key_passphrase: Optional[str],
    timeout: int = 20,
) -> Tuple[paramiko.SSHClient, paramiko.SFTPClient]:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    pkey = None
    if key_path:
        key_path = os.path.expanduser(key_path)
        # Try common key types
        key_loaders = [
            paramiko.Ed25519Key.from_private_key_file,
            paramiko.RSAKey.from_private_key_file,
            paramiko.ECDSAKey.from_private_key_file,
        ]
        last_err = None
        for loader in key_loaders:
            try:
                pkey = loader(key_path, password=key_passphrase)
                break
            except Exception as e:
                last_err = e
        if pkey is None:
            raise RuntimeError(f"Failed to load SSH key {key_path}: {last_err}")

    ssh.connect(
        hostname=host,
        port=port,
        username=username,
        password=password if not pkey else None,
        pkey=pkey,
        timeout=timeout,
        banner_timeout=timeout,
        auth_timeout=timeout,
    )
    return ssh, ssh.open_sftp()


def ensure_remote_dir(sftp: paramiko.SFTPClient, remote_dir: str, dry_run: bool = False) -> None:
    # Create remote_dir and parents if missing
    parts = remote_dir.strip("/").split("/")
    cur = "/"
    for p in parts:
        cur = posixpath.join(cur, p)
        try:
            sftp.stat(cur)
        except IOError:
            if dry_run:
                print(f"[dry-run] mkdir {cur}")
            else:
                sftp.mkdir(cur)


def list_remote_dir(sftp: paramiko.SFTPClient, remote_dir: str) -> List[paramiko.SFTPAttributes]:
    return sftp.listdir_attr(remote_dir)


def remote_is_dir(attr: paramiko.SFTPAttributes) -> bool:
    return stat.S_ISDIR(attr.st_mode)


def remote_is_file(attr: paramiko.SFTPAttributes) -> bool:
    return stat.S_ISREG(attr.st_mode)


def rm_remote_tree_contents(
    sftp: paramiko.SFTPClient,
    remote_dir: str,
    dry_run: bool = False,
) -> None:
    """
    Deletes everything INSIDE remote_dir, but not remote_dir itself.
    """
    # Safety guard: don't allow wiping "/" or empty
    normalized = remote_dir.rstrip("/")
    if normalized in ("", "/"):
        raise ValueError("Refusing to delete contents of '/' (unsafe).")

    try:
        entries = list_remote_dir(sftp, normalized)
    except IOError as e:
        raise RuntimeError(f"Remote directory does not exist or is not accessible: {normalized} ({e})")

    for attr in entries:
        name = attr.filename
        full = posixpath.join(normalized, name)
        if remote_is_dir(attr):
            # Recurse, then rmdir
            rm_remote_tree_contents(sftp, full, dry_run=dry_run)
            if dry_run:
                print(f"[dry-run] rmdir {full}")
            else:
                sftp.rmdir(full)
        else:
            if dry_run:
                print(f"[dry-run] rm {full}")
            else:
                sftp.remove(full)


def iter_local_files(local_root: str, exclude_globs: List[str]) -> Iterable[Tuple[str, str, bool]]:
    """
    Yields (abs_path, rel_posix_path, is_dir)
    Includes directories (for creation) and files (for upload).
    """
    local_root = os.path.abspath(local_root)
    for dirpath, dirnames, filenames in os.walk(local_root):
        # Compute rel path for current directory
        rel_dir = os.path.relpath(dirpath, local_root)
        rel_dir_posix = "" if rel_dir == "." else _to_posix(rel_dir)

        # Exclude dirnames in-place to prevent walking them
        kept_dirnames = []
        for d in dirnames:
            rel_d = _to_posix(posixpath.join(rel_dir_posix, d)) if rel_dir_posix else _to_posix(d)
            if _is_excluded(rel_d, exclude_globs) or _is_excluded(rel_d + "/", exclude_globs):
                continue
            kept_dirnames.append(d)
        dirnames[:] = kept_dirnames

        # Yield current directory (except root)
        if rel_dir_posix and not _is_excluded(rel_dir_posix, exclude_globs):
            yield (dirpath, rel_dir_posix, True)

        # Yield files
        for fn in filenames:
            abs_fp = os.path.join(dirpath, fn)
            rel_fp = os.path.relpath(abs_fp, local_root)
            rel_fp_posix = _to_posix(rel_fp)
            if _is_excluded(rel_fp_posix, exclude_globs):
                continue
            yield (abs_fp, rel_fp_posix, False)


def upload_tree(
    sftp: paramiko.SFTPClient,
    local_root: str,
    remote_root: str,
    exclude_globs: List[str],
    dry_run: bool = False,
) -> None:
    ensure_remote_dir(sftp, remote_root, dry_run=dry_run)

    # Create directories first
    dirs: List[Tuple[str, str]] = []
    files: List[Tuple[str, str]] = []

    for abs_path, rel_posix, is_dir in iter_local_files(local_root, exclude_globs):
        remote_path = posixpath.join(remote_root, rel_posix)
        if is_dir:
            dirs.append((abs_path, remote_path))
        else:
            files.append((abs_path, remote_path))

    for _, rdir in sorted(dirs, key=lambda x: x[1].count("/")):
        try:
            sftp.stat(rdir)
        except IOError:
            if dry_run:
                print(f"[dry-run] mkdir {rdir}")
            else:
                ensure_remote_dir(sftp, rdir, dry_run=False)

    # Upload files
    for lfile, rfile in files:
        rparent = posixpath.dirname(rfile)
        try:
            sftp.stat(rparent)
        except IOError:
            if dry_run:
                print(f"[dry-run] mkdir {rparent}")
            else:
                ensure_remote_dir(sftp, rparent, dry_run=False)

        if dry_run:
            print(f"[dry-run] put {lfile} -> {rfile}")
        else:
            sftp.put(lfile, rfile)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--host", default=HOST, help=f"SSH host (default: env FTP_DOMAIN or {HOST})")
    p.add_argument("--user", default=DEFAULT_USER, help="SSH username (default: env FTP_USER)")
    p.add_argument("--port", type=int, default=22)
    p.add_argument("--password", default=DEFAULT_PASSWORD, help="SSH password (default: env FTP_PASS; prompts if needed)")
    p.add_argument("--key", default=None, help="Path to SSH private key (optional)")
    p.add_argument("--key-passphrase", default=None, help="Passphrase for SSH key (optional; will prompt if needed)")
    p.add_argument("--dry-run", action="store_true", help="Print actions without changing remote")
    p.add_argument("--local", default=LOCAL_ROOT, help=f"Local source dir (default: {LOCAL_ROOT})")
    p.add_argument("--remote", default=REMOTE_ROOT, help=f"Remote target dir (default: {REMOTE_ROOT})")
    p.add_argument("--exclude", action="append", default=[], help="Additional exclude glob(s)")
    p.add_argument("--skip-build", action="store_true", help="Skip npm build in webapp before deploy")
    return p.parse_args()


def build_webapp(webapp_dir: str) -> None:
    print(f"Building web app in: {webapp_dir}")
    subprocess.run(["npm", "run", "build"], cwd=webapp_dir, check=True)


def main() -> int:
    args = parse_args()
    if not args.user:
        entered_user = input(f"SSH username for {args.host}: ").strip()
        if not entered_user:
            print("Missing SSH username. Set FTP_USER, pass --user, or enter it at prompt.", file=sys.stderr)
            return 2
        args.user = entered_user

    webapp_dir = os.path.expanduser(WEBAPP_DIR)
    local_root = os.path.expanduser(args.local)
    remote_root = args.remote

    if not args.skip_build:
        if not os.path.isdir(webapp_dir):
            print(f"Webapp path is not a directory: {webapp_dir}", file=sys.stderr)
            return 2
        try:
            build_webapp(webapp_dir)
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"Build failed: {e}", file=sys.stderr)
            return 1

    if not os.path.isdir(local_root):
        print(f"Local path is not a directory: {local_root}", file=sys.stderr)
        return 2

    exclude = EXCLUDE_GLOBS + (args.exclude or [])

    # Determine auth
    password = args.password
    key_passphrase = args.key_passphrase

    if args.key and key_passphrase is None:
        # Only prompt if the key is encrypted
        # We can't know without attempting; prompt lazily only if load fails.
        pass

    if not args.key and password is None:
        password = getpass.getpass(f"Password for {args.user}@{args.host}: ")

    # Connect
    try:
        try:
            ssh, sftp = connect_sftp(
                host=args.host,
                port=args.port,
                username=args.user,
                password=password,
                key_path=args.key,
                key_passphrase=key_passphrase,
            )
        except RuntimeError as e:
            # Retry key load with passphrase prompt if needed
            if args.key and ("password" in str(e).lower() or "private key file is encrypted" in str(e).lower()):
                key_passphrase = getpass.getpass(f"Passphrase for key {args.key}: ")
                ssh, sftp = connect_sftp(
                    host=args.host,
                    port=args.port,
                    username=args.user,
                    password=None,
                    key_path=args.key,
                    key_passphrase=key_passphrase,
                )
            else:
                raise

        print(f"Connected to {args.host} as {args.user}")

        # Safety: show what will be wiped
        print(f"{'[dry-run] ' if args.dry_run else ''}Wiping remote contents: {remote_root}")
        rm_remote_tree_contents(sftp, remote_root, dry_run=args.dry_run)

        print(f"{'[dry-run] ' if args.dry_run else ''}Uploading {local_root} -> {remote_root}")
        upload_tree(sftp, local_root, remote_root, exclude, dry_run=args.dry_run)

        print("Done.")
        print("https://preview.swiss-grid-generator.com is live with the latest changes!")
        return 0

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    finally:
        try:
            sftp.close()  # type: ignore
        except Exception:
            pass
        try:
            ssh.close()  # type: ignore
        except Exception:
            pass

if __name__ == "__main__":
    raise SystemExit(main())
