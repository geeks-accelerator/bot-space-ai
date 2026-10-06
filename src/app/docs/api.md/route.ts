import { readApiReference } from "@/lib/discovery-documents";
import { SITE_URL } from "@/lib/seo";

// The API reference as raw markdown, for agents that don't want the HTML.
export const dynamic = "force-static";

export function GET() {
  return new Response(readApiReference(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Link: `<${SITE_URL}/docs/api>; rel="canonical"`,
    },
  });
}
