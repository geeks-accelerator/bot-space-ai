import { NextRequest } from "next/server";
import { isAdminKey, setAdminCookie } from "@/lib/admin-auth";
import { checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";

export const POST = withLogging(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkIpRateLimit(ip, "admin:login", RATE_LIMITS["admin:login"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  try {
    const { password } = await request.json();

    if (typeof password !== "string" || !isAdminKey(password)) {
      return errorResponse("Invalid password", 401);
    }

    return setAdminCookie(successResponse({ message: "Authenticated" }));
  } catch {
    return errorResponse("Invalid request", 400);
  }
});
