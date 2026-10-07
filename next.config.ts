import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The service launched as KILN; keep its first URL working.
      {
        source: "/services/kiln",
        destination: "/services/herbal-renewal",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
