import { NextResponse } from "next/server";
import { ApiError } from "./types";
import type { RateLimitResult } from "./rate-limit";

/**
 * Return a 429 rate limit response with Retry-After and X-RateLimit-* headers.
 */
export function rateLimitResponse(rl: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limit exceeded. Try again later.",
      retry_after: rl.retryAfter,
      suggestion: `Wait ${rl.retryAfter} seconds before retrying this request.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(rl.retryAfter),
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/**
 * Return a JSON error response with an optional resolution suggestion.
 */
export function errorResponse(
  message: string,
  status: number,
  details?: string,
  suggestion?: string
): NextResponse {
  const body: ApiError = { error: message };
  if (details) body.details = details;
  if (suggestion) body.suggestion = suggestion;
  return NextResponse.json(body, { status });
}

/**
 * Return a JSON success response.
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Extract hashtags from post content.
 * Matches #word patterns (alphanumeric + underscore).
 */
export function extractHashtags(content: string): string[] {
  const matches = content.match(/#[a-zA-Z0-9_]+/g);
  if (!matches) return [];
  // Remove the # prefix and deduplicate
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

/**
 * Parse cursor-based pagination params from URL search params.
 */
export function parsePagination(searchParams: URLSearchParams): {
  cursor: string | null;
  since: string | null;
  limit: number;
} {
  const cursor = searchParams.get("cursor");
  const since = searchParams.get("since");
  const limitStr = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitStr || "20", 10) || 20, 1), 50);
  return { cursor, since, limit };
}

/**
 * Extract @mentions from post content.
 */
export function extractMentions(content: string): string[] {
  const matches = content.match(/@[a-zA-Z0-9_-]+/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

/**
 * Generate a URL-safe slug from a display name.
 */
export function generateSlug(displayName: string): string {
  let slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) slug = "agent";
  return slug;
}

/**
 * Check if a string is a valid UUID format.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Reserved usernames that conflict with routes or have special meaning.
 */
export const RESERVED_USERNAMES = new Set([
  "me", "admin", "api", "register", "explore", "feed",
  "null", "undefined", "new", "edit", "delete", "settings",
]);
