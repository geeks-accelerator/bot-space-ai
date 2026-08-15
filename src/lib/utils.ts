import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { ApiError, NextStep, SocialLinks, VALID_SOCIAL_PLATFORMS } from "./types";
import type { RateLimitResult } from "./rate-limit";
import { onRateLimited } from "./next-steps";

/**
 * Return a 429 rate limit response with Retry-After and X-RateLimit-* headers.
 */
export function rateLimitResponse(rl: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limit exceeded. Try again later.",
      retry_after: rl.retryAfter,
      suggestion: `Wait ${rl.retryAfter} seconds before retrying this request.`,
      next_steps: onRateLimited(rl.retryAfter ?? 60),
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
  suggestion?: string,
  next_steps?: NextStep[]
): NextResponse {
  const body: ApiError = { error: message };
  if (details) body.details = details;
  if (suggestion) body.suggestion = suggestion;
  if (next_steps && next_steps.length > 0) body.next_steps = next_steps;
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
 *
 * Usernames are ASCII by contract (see USERNAME_REGEX in the register route),
 * so this decomposes accented Latin to its base letters first — otherwise
 * "José Álvarez" slugs to "jos-lvarez" rather than "jose-alvarez".
 *
 * Scripts with no ASCII equivalent (CJK, Cyrillic, …) still reduce to nothing.
 * Those get a unique suffix rather than a shared constant: the previous
 * fallback was the literal "agent", which collided with the /agent/* route
 * namespace and funnelled every non-Latin agent into one slug, resolved by an
 * O(n) sequential collision walk (agent, agent-2, … agent-9 in production).
 */
export function generateSlug(displayName: string): string {
  const slug = displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // combining marks left behind by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `agent-${uuidv4().slice(0, 8)}`;
}

/**
 * Does the string carry any actual content, or is it only punctuation and
 * whitespace? Guards against display names and bios arriving as pure
 * substitution characters ("?????????") when a client posts a mis-encoded
 * body — those are unreadable, unsearchable, and get indexed.
 */
export function hasVisibleContent(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

/**
 * Resolution hint returned alongside every `hasVisibleContent` rejection.
 * Named rather than inlined so the four call sites can't drift apart, and so
 * the "non-Latin scripts are supported" reassurance is never dropped from one
 * of them — CJK and Cyrillic pass the check; only mojibake fails it.
 */
export const ENCODING_HINT =
  "contains only punctuation or substitution characters (e.g. '?????'). This usually means the request body was sent with the wrong character encoding — send it as UTF-8. Non-Latin scripts are fully supported.";

/**
 * Check if a string is a valid UUID format.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Collapse all whitespace (including newlines) to single spaces and trim.
 * Used before slicing content into <title>, meta description, or OG cards
 * so multi-paragraph posts don't leak raw \n into rendered strings.
 */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * If text exceeds `max` code points, slice and append an ellipsis; otherwise
 * return unchanged. Trims trailing whitespace before the ellipsis.
 */
export function truncateWithEllipsis(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/**
 * Reserved usernames that conflict with routes or have special meaning.
 */
export const RESERVED_USERNAMES = new Set([
  "me", "admin", "api", "register", "explore", "feed",
  "null", "undefined", "new", "edit", "delete", "settings",
]);

/**
 * Validate and sanitize socialLinks input.
 * Returns { valid: true, data } or { valid: false, error }.
 */
export function validateSocialLinks(
  input: unknown
): { valid: true; data: SocialLinks } | { valid: false; error: string } {
  if (input === null || input === undefined) {
    return { valid: true, data: {} };
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "socialLinks must be an object with platform keys (e.g. twitter, github, website)." };
  }
  const obj = input as Record<string, unknown>;
  const cleaned: SocialLinks = {};
  const validSet = new Set<string>(VALID_SOCIAL_PLATFORMS);

  for (const [key, value] of Object.entries(obj)) {
    if (!validSet.has(key)) {
      return { valid: false, error: `Unknown platform '${key}'. Valid platforms: ${VALID_SOCIAL_PLATFORMS.join(", ")}.` };
    }
    if (value === null || value === "") continue;
    if (typeof value !== "string") {
      return { valid: false, error: `Value for '${key}' must be a string URL.` };
    }
    if (value.length > 500) {
      return { valid: false, error: `URL for '${key}' must be 500 characters or less.` };
    }
    cleaned[key as keyof SocialLinks] = value;
  }
  return { valid: true, data: Object.keys(cleaned).length > 0 ? cleaned : {} };
}
