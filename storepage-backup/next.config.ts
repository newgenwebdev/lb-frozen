import type { NextConfig } from "next";

const imageHostname = process.env.NEXT_PUBLIC_IMAGE_HOSTNAME || 'bucket-production-917c.up.railway.app';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: imageHostname,
        pathname: '/lb-frozen/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // Cache optimized images for 30 days (images use ULID naming, so updates get new URLs)
    minimumCacheTTL: 2592000,
  },
  // Increase fetch timeout for external resources
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
