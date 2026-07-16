import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";
    const apiGatewayUrl = process.env.API_GATEWAY_URL || (isProd 
      ? "https://futurespark-backend-one.vercel.app" 
      : "http://localhost:3000"
    );

    return [
      {
        source: "/api/:path*",
        destination: `${apiGatewayUrl}/api/:path*`, // Proxy to API Gateway
      },
    ];
  },
};

export default nextConfig;
