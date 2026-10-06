import { apiCatalog } from "@/lib/discovery-documents";

// A route, not a static file: an extensionless file in public/ loses its
// content type.
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(apiCatalog(), null, 2), {
    headers: { "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"' },
  });
}
