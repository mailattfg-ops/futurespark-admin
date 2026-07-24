import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.20.17",
    "172.18.48.1"
  ],
  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";
    const apiGatewayUrl = process.env.API_GATEWAY_URL || (isProd 
      ? "https://futurespark-backend-1ps3.onrender.com" 
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
