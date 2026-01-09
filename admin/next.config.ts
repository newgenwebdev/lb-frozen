import type { NextConfig } from "next";

// Get bucket hostname from environment variable
const bucketUrl = process.env.NEXT_PUBLIC_BUCKET_URL || "https://bucket-production-917c.up.railway.app";
const bucketHostname = new URL(bucketUrl).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: bucketHostname,
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "bucket-production-e243.up.railway.app",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
