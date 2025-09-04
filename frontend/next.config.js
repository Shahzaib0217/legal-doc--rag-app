/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now stable in Next.js 15+
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Serverless environment optimizations
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
