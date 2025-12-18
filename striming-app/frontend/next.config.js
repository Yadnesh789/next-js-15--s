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
  
  // Transpile antd for proper SSR support
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/nextjs-registry'],
  
  // Turbopack configuration (updated for Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
    resolveAlias: {
      underscore: 'lodash',
      mocha: { browser: 'mocha/browser-entry.js' },
    },
    resolveExtensions: [
      '.mdx',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.mjs',
      '.json',
    ],
  },
  
  // Experimental features
  experimental: {
    // Enable faster refresh
    optimisticClientCache: true,
  },
  
  // Webpack fallback for legacy compatibility
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Enable faster builds in development
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;

