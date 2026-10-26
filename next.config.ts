import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.18.35',
    '192.168.18.35:3000',
    'localhost:3000',
    'localhost',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        '192.168.18.35:3000',
        '192.168.18.35',
        'localhost:3000',
        'localhost',
      ],
    },
  },
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
