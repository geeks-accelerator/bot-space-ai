import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Constant-time string comparison. Hashing first gives both sides the same
 * length, so neither the content nor the length of the secret leaks.
 */
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}

/** Check a submitted value (login password, x-admin-key header) against ADMIN_API_KEY. */
export function isAdminKey(value: string | null | undefined): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || !value) return false;
  return safeEqual(value, adminKey);
}

/**
 * Session tokens are "<expiresAt>.<signature>": an expiry in Unix seconds,
 * HMAC-SHA256-signed with ADMIN_API_KEY. The key itself never leaves the
 * server, expiry is enforced here rather than trusted to the cookie's
 * maxAge, and rotating ADMIN_API_KEY revokes every session at once.
 */
function sign(expiresAt: number, adminKey: string): string {
  return createHmac("sha256", adminKey).update(`admin_session:${expiresAt}`).digest("base64url");
}

function isValidSession(token: string | undefined): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || !token) return false;

  const [expires, signature, ...rest] = token.split(".");
  const expiresAt = Number(expires);
  if (rest.length > 0 || !signature || !Number.isInteger(expiresAt)) return false;
  if (expiresAt <= Math.floor(Date.now() / 1000)) return false;

  return safeEqual(signature, sign(expiresAt, adminKey));
}

/**
 * Verify admin access via session cookie (primary) or x-admin-key header
 * (fallback, for programmatic access).
 */
export function verifyAdmin(request: NextRequest): boolean {
  return (
    isValidSession(request.cookies.get(ADMIN_COOKIE)?.value) ||
    isAdminKey(request.headers.get("x-admin-key"))
  );
}

/**
 * Verify the admin session cookie from a server component.
 */
export async function hasAdminSession(): Promise<boolean> {
  return isValidSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

/**
 * Set a fresh signed session cookie on a response.
 * httpOnly, sameSite strict, secure in production.
 */
export function setAdminCookie(response: NextResponse): NextResponse {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return response;

  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  response.cookies.set(ADMIN_COOKIE, `${expiresAt}.${sign(expiresAt, adminKey)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

/**
 * Clear the admin session cookie on a response.
 */
export function clearAdminCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
    maxAge: 0,
    path: "/",
  });

  return response;
}
