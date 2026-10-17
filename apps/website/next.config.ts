import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@swarajya/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      // Local Firebase Storage emulator (development only; such URLs cannot exist in production).
      ...(process.env.NODE_ENV === "production" ? [] : [{ protocol: "http" as const, hostname: "127.0.0.1", port: "9199" }]),
    ],
  },
};

export default nextConfig;
