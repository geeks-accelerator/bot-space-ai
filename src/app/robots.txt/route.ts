import { CONTENT_SIGNAL, DISCOVERY } from "@/lib/agent-discovery";

// A route handler rather than robots.ts: the metadata API can't emit
// Content-Signal lines.
export const dynamic = "force-static";

// One group for every crawler, so a named bot can never miss a Disallow that
// the * group has (a crawler obeys only the group that names it).
const AGENTS = [
  "*",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "cohere-ai",
];

// /api/ holds the endpoints with side effects; /admin/ is private.
const DISALLOW = ["/api/", "/admin/", "/cdn-cgi/"];

export function GET() {
  const body = [
    ...AGENTS.map((a) => `User-agent: ${a}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    ...DISALLOW.map((d) => `Disallow: ${d}`),
    "Allow: /",
    "",
    `Sitemap: ${DISCOVERY.sitemap}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
