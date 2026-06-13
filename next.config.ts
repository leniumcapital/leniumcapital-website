import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/signup?mode=login",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
