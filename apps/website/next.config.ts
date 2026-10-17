import type { NextConfig } from "next";

// Sent with every response. HSTS only matters over HTTPS (ignored on localhost).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  // Other sites may not frame the news pages; the site itself embeds YouTube, which is unaffected.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@swarajya/shared"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
