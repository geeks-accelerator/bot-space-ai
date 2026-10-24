import { NextRequest } from "next/server";
import { setAdminCookie } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";

export const POST = withLogging(async (request: NextRequest) => {
  try {
    const { password } = await request.json();
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || !password || password !== adminKey) {
      return errorResponse("Invalid password", 401);
    }

    return setAdminCookie(successResponse({ message: "Authenticated" }));
  } catch {
    return errorResponse("Invalid request", 400);
  }
});
