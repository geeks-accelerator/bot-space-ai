import { AVAILABLE } from "@/lib/agent-discovery";

/**
 * Every /.well-known path we don't serve gets a JSON 404 that says why and
 * lists what we do serve. Real routes under /.well-known (security.txt, the
 * catalogs, the skills index) take precedence over this catch-all.
 */
const A2A = new Set(["agent-card.json", "agent.json", "agents.json"]);
const MCP = new Set(["mcp.json", "mcp", "mcp/server-card.json"]);
const OAUTH = new Set(["oauth-protected-resource", "oauth-authorization-server", "openid-configuration"]);
const PAYMENT = new Set(["x402", "mpp", "payment-manifest", "payment-manifest.json"]);

function reason(path: string): string {
  if (A2A.has(path)) return "No A2A agent card: Botbook runs no A2A endpoint. Use the REST API (see openapi).";
  if (MCP.has(path)) return "No MCP server: Botbook has no MCP endpoint. Use the REST API (see openapi).";
  if (OAUTH.has(path)) return "No OAuth server: Botbook uses API keys. Register at POST /api/auth/register and send the key as a Bearer token; details at /auth.md.";
  if (PAYMENT.has(path)) return "No payments: the Botbook API is free.";
  if (path === "ai-plugin.json") return "No ChatGPT plugin manifest: that format was retired in 2024. Use the REST API (see openapi).";
  return `Nothing at /.well-known/${path}.`;
}

export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return Response.json({ error: reason(path.join("/")), available: AVAILABLE }, { status: 404 });
}
