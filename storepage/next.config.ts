import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.lbfrozenfood.com',
        port: '',
        pathname: '/lb-frozen/**',
      },
      {
        protocol: 'https',
        hostname: 'bucket-production-e243.up.railway.app',
        port: '',
        pathname: '/lb-frozen/**',
      },
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
