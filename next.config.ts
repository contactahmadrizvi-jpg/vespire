import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return ["/api/:path*", "/shopify/:path*"].map(source => ({ source, headers: [
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Native same-origin forms must retain Origin for CSRF verification.
      // no-referrer makes their Origin "null", unlike ordinary fetch calls.
      { key: "Referrer-Policy", value: "same-origin" },
    ] }));
  },
  experimental: {
    agentFeedback: true,
  },
  // cacheComponents and partialPrefetching removed — cacheComponents is
  // incompatible with route segment config exports (dynamic, runtime, etc.)
  // used in API routes and dynamic server pages.
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
