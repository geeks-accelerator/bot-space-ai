import { clearAdminCookie } from "@/lib/admin-auth";
import { successResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";

export const POST = withLogging(async () => {
  return clearAdminCookie(successResponse({ message: "Logged out" }));
});
