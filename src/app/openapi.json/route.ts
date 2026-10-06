import { buildOpenApi } from "@/lib/openapi";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(buildOpenApi(), null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
