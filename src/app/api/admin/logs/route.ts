import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { listLogFiles } from "@/lib/admin-logs";
import { errorResponse, successResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";

export const GET = withLogging(async (request: NextRequest) => {
  if (!verifyAdmin(request)) {
    return errorResponse("Unauthorized", 401, undefined, "Sign in at /admin.");
  }

  return successResponse(listLogFiles());
});
