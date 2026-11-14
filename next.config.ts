import type { NextConfig } from "next";
import { LINK_HEADER } from "./src/lib/agent-discovery";

/**
 * Where avatars are served from. Local Supabase is http://127.0.0.1:54421 and
 * production is a hosted https origin, so this is read from the environment
 * rather than hardcoded — a literal production origin blanks every avatar in
 * local dev and CI. Not imported from src/lib/supabase.ts: that module builds
 * a client and throws without the service-role key, which has no business
 * running while Next evaluates its config.
 */
const SUPABASE_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();

/**
 * Served as Content-Security-Policy-Report-Only first; the enforcing header is
 * the same string under the other key, once the reports come back clean.
 *
 * 'unsafe-inline' stays in script-src because three separate sources emit
 * inline scripts: Next's own __next_f flight payload (content differs per page
 * and per deploy), the GA bootstrap in app/layout.tsx, and JsonLd's ld+json
 * blocks. Nonces would fix that but force dynamic rendering, which would strip
 * s-maxage from every page and undo the ISR work. 'unsafe-eval' is NOT here
 * and nothing needs it.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data:${SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN}` : ""}`,
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // upgrade-insecure-requests is deliberately absent: it is ignored in a
  // report-only policy and logs a console error on every page load, which
  // buries the real violations this phase exists to surface. Add it in the
  // same commit that switches the header key to the enforcing one.
].join("; ");

const nextConfig: NextConfig = {
  // Don't advertise the framework (and, via fingerprinting, its version).
  poweredByHeader: false,
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
          {
            key: "Content-Security-Policy-Report-Only",
            value: CONTENT_SECURITY_POLICY,
          },
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
