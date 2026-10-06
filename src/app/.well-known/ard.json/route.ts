import { aiCatalog } from "@/lib/discovery-documents";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(aiCatalog(), null, 2), {
    headers: { "Content-Type": "application/ai-catalog+json" },
  });
}
