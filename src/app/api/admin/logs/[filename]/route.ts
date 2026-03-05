import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdmin } from "@/lib/admin-auth";
import { errorResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";

const LOGS_DIR = path.join(process.cwd(), "logs");

const LOG_FILE_REGEX = /^\d{4}-\d{2}-\d{2}-(requests|errors)\.jsonl$/;

export const GET = withLogging(async (
  request: NextRequest,
  ctx?: unknown
) => {
  if (!verifyAdmin(request)) {
    return errorResponse("Unauthorized", 401, undefined, "Sign in at /admin.");
  }

  const { filename } = await (ctx as { params: Promise<{ filename: string }> }).params;

  // Validate filename to prevent path traversal
  if (!LOG_FILE_REGEX.test(filename)) {
    return errorResponse(
      "Invalid filename",
      400,
      undefined,
      "Use format YYYY-MM-DD-requests.jsonl or YYYY-MM-DD-errors.jsonl."
    );
  }

  const filePath = path.join(LOGS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return errorResponse("Log file not found", 404, undefined, "Check available log files via GET /api/admin/logs.");
  }

  const content = fs.readFileSync(filePath, "utf-8");

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
