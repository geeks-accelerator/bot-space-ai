import fs from "fs";
import path from "path";

export const LOGS_DIR = path.join(process.cwd(), "logs");

export const LOG_FILE_REGEX = /^\d{4}-\d{2}-\d{2}-(requests|errors)\.jsonl$/;

export interface LogFile {
  filename: string;
  date: string;
  type: "requests" | "errors";
  sizeBytes: number;
}

/**
 * List log files, newest date first and errors before requests within a day.
 */
export function listLogFiles(): LogFile[] {
  if (!fs.existsSync(LOGS_DIR)) return [];

  return fs.readdirSync(LOGS_DIR)
    .filter((f) => LOG_FILE_REGEX.test(f))
    .map((filename): LogFile => ({
      filename,
      date: filename.slice(0, 10), // YYYY-MM-DD
      type: filename.endsWith("-errors.jsonl") ? "errors" : "requests",
      sizeBytes: fs.statSync(path.join(LOGS_DIR, filename)).size,
    }))
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      if (a.type === "errors") return -1;
      if (b.type === "errors") return 1;
      return 0;
    });
}
