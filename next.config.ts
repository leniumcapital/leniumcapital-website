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
      {
        source: "/account",
        destination: "/dashboard/account",
        permanent: false,
      },
      {
        source: "/payouts",
        destination: "/dashboard/payouts",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
