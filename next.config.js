/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.module.rules.push({
      test: /socratic-stage-prompts[\\/].*\.md$/,
      type: 'asset/source',
    });

    return config;
  },
};

module.exports = nextConfig;
