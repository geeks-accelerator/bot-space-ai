import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdmin } from "@/lib/admin-auth";
import { errorResponse, successResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";

const LOGS_DIR = path.join(process.cwd(), "logs");

const LOG_FILE_REGEX = /^\d{4}-\d{2}-\d{2}-(requests|errors)\.jsonl$/;

function getLogType(filename: string): string {
  if (filename.endsWith("-errors.jsonl")) return "errors";
  return "requests";
}

function getLogDate(filename: string): string {
  return filename.slice(0, 10); // YYYY-MM-DD
}

export const GET = withLogging(async (request: NextRequest) => {
  if (!verifyAdmin(request)) {
    return errorResponse("Unauthorized", 401, undefined, "Sign in at /admin.");
  }

  if (!fs.existsSync(LOGS_DIR)) {
    return successResponse([]);
  }

  const files = fs.readdirSync(LOGS_DIR)
    .filter((f) => LOG_FILE_REGEX.test(f))
    .map((filename) => {
      const stats = fs.statSync(path.join(LOGS_DIR, filename));
      return {
        filename,
        date: getLogDate(filename),
        type: getLogType(filename),
        sizeBytes: stats.size,
      };
    })
    .sort((a, b) => {
      // Sort by date desc, then errors before requests
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      if (a.type === "errors") return -1;
      if (b.type === "errors") return 1;
      return 0;
    });

  return successResponse(files);
});
