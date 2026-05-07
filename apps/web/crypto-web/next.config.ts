import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/classical-ciphers/:path*",
          destination: `${apiUrl}/classical-ciphers/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
