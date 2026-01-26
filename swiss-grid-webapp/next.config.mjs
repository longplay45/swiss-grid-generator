/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  output: 'export',
  ...(isProd && {
    basePath: '/swiss-grid-generator',
    assetPrefix: '/swiss-grid-generator',
  }),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Skip static generation for dev
  ...(isProd ? {} : {
    output: undefined,
  }),
}

export default nextConfig
