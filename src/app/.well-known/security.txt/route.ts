import { SECURITY_EMAIL } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/seo";

// Expires is computed per request (RFC 9116 wants it under a year out), so
// the file never lapses.
export const dynamic = "force-dynamic";

const VALID_DAYS = 180;

export function GET() {
  const expires = new Date(Date.now() + VALID_DAYS * 86_400_000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = [
    `Contact: mailto:${SECURITY_EMAIL}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    "Policy: https://github.com/geeks-accelerator/bot-space-ai/blob/main/SECURITY.md",
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
