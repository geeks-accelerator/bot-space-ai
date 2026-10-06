import { aiCatalog } from "@/lib/discovery-documents";

// The ARD predecessor's path: the same document as /.well-known/ard.json.
// Route segment config can't be re-exported, so this is spelled out.
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(aiCatalog(), null, 2), {
    headers: { "Content-Type": "application/ai-catalog+json" },
  });
}
