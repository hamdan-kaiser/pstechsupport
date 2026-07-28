/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  images: { unoptimized: true },
}
module.exports = nextConfig
