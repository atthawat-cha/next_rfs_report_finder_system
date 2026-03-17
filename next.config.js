/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lodash'],
  },
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
