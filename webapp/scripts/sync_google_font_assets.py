#!/usr/bin/env python3
"""
Sync local Google font assets for preview/PDF parity.

For each font configured in lib/config/fonts.ts:
1) Discover the corresponding Google Fonts repo directory.
2) Download variable upright + italic TTF sources.
3) Build static instances at weight 400 and 700.
4) Write:
   public/fonts/google/<slug>/regular.ttf
   public/fonts/google/<slug>/bold.ttf
   public/fonts/google/<slug>/italic.ttf
   public/fonts/google/<slug>/bolditalic.ttf
"""

from __future__ import annotations

import json
import re
import shutil
import tempfile
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


ROOT = Path(__file__).resolve().parents[1]
FONTS_TS = ROOT / "lib" / "config" / "fonts.ts"
OUT_ROOT = ROOT / "public" / "fonts" / "google"
GOOGLE_API_BASE = "https://api.github.com/repos/google/fonts/contents"
GOOGLE_RAW_BASE = "https://raw.githubusercontent.com/google/fonts/main"


def read_configured_font_families() -> List[str]:
    text = FONTS_TS.read_text("utf-8")
    families = re.findall(r'value:\s*"([^"]+)"', text)
    if not families:
        raise RuntimeError(f"No font families found in {FONTS_TS}")
    seen = set()
    ordered = []
    for name in families:
        if name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered


def slugify(font_family: str) -> str:
    return re.sub(r"[^a-z0-9]", "", font_family.lower())


def base_name(font_family: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", font_family)


def get_json(url: str):
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def discover_repo_files(font_family: str) -> Tuple[str, str, str]:
    slug = slugify(font_family)
    basename = base_name(font_family)

    for bucket in ("ofl", "apache", "ufl"):
        api_url = f"{GOOGLE_API_BASE}/{bucket}/{slug}"
        try:
            listing = get_json(api_url)
        except Exception:
            continue

        ttf_files = [
            entry["name"]
            for entry in listing
            if entry.get("type") == "file"
            and isinstance(entry.get("name"), str)
            and entry["name"].endswith(".ttf")
        ]
        if not ttf_files:
            continue

        upright = next(
            (name for name in ttf_files if name.startswith(basename) and "-Italic" not in name),
            None,
        )
        if upright is None:
            continue

        italic = next(
            (name for name in ttf_files if name.startswith(f"{basename}-Italic")),
            upright,
        )
        return bucket, upright, italic

    raise RuntimeError(f"Could not resolve Google Fonts source for '{font_family}'")


def download_to(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as response, destination.open("wb") as out:
        out.write(response.read())


def instantiate_weight(source_path: Path, output_path: Path, weight: int) -> None:
    font = TTFont(source_path)
    if "fvar" in font:
        axis_limits: Dict[str, float] = {}
        for axis in font["fvar"].axes:
            axis_limits[axis.axisTag] = axis.defaultValue
        if "wght" in axis_limits:
            axis_limits["wght"] = float(weight)
        instance = instantiateVariableFont(font, axis_limits, inplace=False)
        instance.save(output_path)
    else:
        shutil.copy2(source_path, output_path)


def sync_font(font_family: str) -> None:
    slug = slugify(font_family)
    bucket, upright_file, italic_file = discover_repo_files(font_family)

    with tempfile.TemporaryDirectory(prefix=f"sgg-font-{slug}-") as tmp:
        tmp_dir = Path(tmp)
        upright_src = tmp_dir / "upright.ttf"
        italic_src = tmp_dir / "italic.ttf"

        download_to(
            f"{GOOGLE_RAW_BASE}/{bucket}/{slug}/{upright_file}",
            upright_src,
        )
        download_to(
            f"{GOOGLE_RAW_BASE}/{bucket}/{slug}/{italic_file}",
            italic_src,
        )

        out_dir = OUT_ROOT / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        instantiate_weight(upright_src, out_dir / "regular.ttf", 400)
        instantiate_weight(upright_src, out_dir / "bold.ttf", 700)
        instantiate_weight(italic_src, out_dir / "italic.ttf", 400)
        instantiate_weight(italic_src, out_dir / "bolditalic.ttf", 700)

    print(
        f"{font_family}: {bucket}/{slug}/{upright_file} | {italic_file} -> {out_dir}"
    )


def main() -> None:
    families = read_configured_font_families()
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    for family in families:
        sync_font(family)


if __name__ == "__main__":
    main()
