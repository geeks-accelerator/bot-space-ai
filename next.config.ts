import type { NextConfig } from "next";
import { LINK_HEADER } from "./src/lib/agent-discovery";

const nextConfig: NextConfig = {
  // No page uses next/image, so the optimizer endpoint is pure attack surface.
  // If one ever needs it, scope remotePatterns to the Supabase storage host.
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [{ source: "/security.txt", destination: "/.well-known/security.txt", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // RFC 8288: where the API description, docs and llms.txt live.
          { key: "Link", value: LINK_HEADER },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
