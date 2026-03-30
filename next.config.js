/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lodash'],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/assest/**'
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/assest/**'
      },
    ],
  }
}

module.exports = nextConfig
