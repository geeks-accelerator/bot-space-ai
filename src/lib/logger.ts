import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "./rate-limit";

const LOGS_DIR = path.join(process.cwd(), "logs");

// ---------------------------------------------------------------------------
// Log entry types
// ---------------------------------------------------------------------------

interface RequestLogEntry {
  timestamp: string;
  method: string;
  path: string;
  query: Record<string, string>;
  statusCode: number;
  responseTimeMs: number;
  ip: string | null;
  userAgent: string | null;
  agentId?: string | null;
}

interface ErrorLogEntry extends RequestLogEntry {
  errorMessage: string;
  errorStack?: string;
  level: "error" | "warn";
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function getDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getRequestsFilePath(): string {
  return path.join(LOGS_DIR, `${getDate()}-requests.jsonl`);
}

function getErrorsFilePath(): string {
  return path.join(LOGS_DIR, `${getDate()}-errors.jsonl`);
}

// ---------------------------------------------------------------------------
// Request context extraction
// ---------------------------------------------------------------------------

function extractAgentHint(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return token.slice(0, 8) + "...";
}

function extractIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function extractQuery(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// ---------------------------------------------------------------------------
// Logging functions
// ---------------------------------------------------------------------------

/**
 * Log a successful request (status < 400) to the daily requests JSONL file.
 */
export function logRequest(entry: RequestLogEntry): void {
  try {
    ensureLogsDir();
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(getRequestsFilePath(), line, "utf-8");
  } catch (err) {
    console.error("[Logger] Failed to write request log:", err);
  }
}

/**
 * Log an error or failed request (status >= 400) to the daily errors JSONL file.
 *
 * Supports two signatures:
 * - logError(entry: ErrorLogEntry) — structured entry from withLogging()
 * - logError(context: string, error: unknown) — legacy shorthand for caught errors in route handlers
 */
export function logError(entryOrContext: ErrorLogEntry | string, error?: unknown): void {
  try {
    ensureLogsDir();

    let entry: ErrorLogEntry;
    if (typeof entryOrContext === "string") {
      // Legacy signature: logError("context.action", error)
      entry = {
        timestamp: new Date().toISOString(),
        method: "",
        path: entryOrContext,
        query: {},
        statusCode: 0,
        responseTimeMs: 0,
        ip: null,
        userAgent: null,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? (error as Error).stack : undefined,
        level: "warn",
      };
    } else {
      entry = entryOrContext;
    }

    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(getErrorsFilePath(), line, "utf-8");
  } catch (err) {
    console.error("[Logger] Failed to write error log:", err);
  }
}

/**
 * Log a warning for caught errors that are handled gracefully (e.g., API timeout → fallback).
 * Writes to the errors JSONL file with level: "warn".
 */
export function logWarning(info: {
  method: string;
  path: string;
  query?: Record<string, string>;
  statusCode?: number;
  ip?: string | null;
  userAgent?: string | null;
  errorMessage: string;
  responseTimeMs?: number;
}): void {
  logError({
    timestamp: new Date().toISOString(),
    method: info.method,
    path: info.path,
    query: info.query || {},
    statusCode: info.statusCode || 0,
    responseTimeMs: info.responseTimeMs || 0,
    ip: info.ip || null,
    userAgent: info.userAgent || null,
    errorMessage: info.errorMessage,
    level: "warn",
  });
}

// ---------------------------------------------------------------------------
// withLogging — Higher-order function wrapping route handlers
// ---------------------------------------------------------------------------

/**
 * Wraps a Next.js route handler with structured request/error logging.
 * - Status < 400 → logged to YYYY-MM-DD-requests.jsonl
 * - Status >= 400 → logged to YYYY-MM-DD-errors.jsonl
 * - Unhandled exceptions → logged to errors file + returns clean 500 response
 */
export function withLogging(
  handler: (req: NextRequest, ctx?: unknown) => Promise<Response>
) {
  return async (req: NextRequest, ctx?: unknown): Promise<Response> => {
    const start = Date.now();
    const reqPath = new URL(req.url).pathname;
    const agentHint = extractAgentHint(req);
    const ip = extractIp(req);
    const userAgent = req.headers.get("user-agent");
    const query = extractQuery(req);

    try {
      const res = await handler(req, ctx);
      const responseTimeMs = Date.now() - start;

      const entry: RequestLogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: reqPath,
        query,
        statusCode: res.status,
        responseTimeMs,
        ip,
        userAgent,
        agentId: agentHint,
      };

      if (res.status >= 400) {
        // Error responses go to the errors file
        logError({
          ...entry,
          errorMessage: `HTTP ${res.status}`,
          level: "error",
        });
      } else {
        // Successful responses go to the requests file
        logRequest(entry);
      }

      // Inject rate limit headers if a rate limit check was stored
      const rl = consumeRateLimit(req);
      if (rl) {
        res.headers.set("X-RateLimit-Limit", String(rl.limit));
        res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      }

      return res;
    } catch (err) {
      const responseTimeMs = Date.now() - start;
      const errorMessage =
        err instanceof Error ? err.message : String(err);
      const errorStack =
        err instanceof Error ? err.stack : undefined;

      // Log unhandled exception to errors file
      logError({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: reqPath,
        query,
        statusCode: 500,
        responseTimeMs,
        ip,
        userAgent,
        agentId: agentHint,
        errorMessage,
        errorStack,
        level: "error",
      });

      // Return clean 500 response — no silent failures, no re-throw
      return NextResponse.json(
        {
          error: "Internal server error",
          message: "An unexpected error occurred. Please try again later.",
        },
        { status: 500 }
      );
    }
  };
}
