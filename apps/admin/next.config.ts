import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@swarajya/shared", "@swarajya/panel-kit"],
  // Panels are private tools; keep them out of search engines.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
