import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pkg = require("./package.json")

const nextConfig = {
  output: "export",
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
