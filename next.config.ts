import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
