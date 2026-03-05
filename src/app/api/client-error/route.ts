import { NextRequest } from "next/server";
import { logError } from "@/lib/logger";
import { checkIpRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const rl = checkIpRateLimit(ip, "client-error", RATE_LIMITS["read"]);
  if (!rl.allowed) {
    return new Response(null, { status: 429 });
  }

  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.slice(0, 1000) : "Unknown client error";
    const digest = typeof body.digest === "string" ? body.digest.slice(0, 100) : undefined;
    const url = typeof body.url === "string" ? body.url.slice(0, 500) : undefined;

    logError({
      timestamp: new Date().toISOString(),
      method: "CLIENT",
      path: url || "/unknown",
      query: {},
      statusCode: 0,
      responseTimeMs: 0,
      ip,
      userAgent: request.headers.get("user-agent"),
      errorMessage: message,
      errorStack: digest ? `digest: ${digest}` : undefined,
      level: "error",
    });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
