import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@swarajya/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
};

export default nextConfig;
