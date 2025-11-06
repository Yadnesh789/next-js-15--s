/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  // Enable code splitting
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons']
  }
};

module.exports = nextConfig;

