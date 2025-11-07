/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  // Fix workspace root detection  
  outputFileTracingRoot: path.join(__dirname),
  // Enable code splitting
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons']
  }
};

module.exports = nextConfig;

