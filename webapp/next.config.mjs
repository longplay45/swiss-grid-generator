import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const pkg = require("./package.json")
const configDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  output: "export",
  outputFileTracingRoot: path.join(configDir, ".."),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? pkg.version,
    NEXT_PUBLIC_RELEASE_CHANNEL: process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? pkg.config?.releaseChannel ?? "prod",
  },
}

export default nextConfig
