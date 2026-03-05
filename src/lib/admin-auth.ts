import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Verify admin access via cookie (primary) or x-admin-key header (fallback).
 * Cookie value and header value are both compared against ADMIN_API_KEY env var.
 */
export function verifyAdmin(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false;

  // Check cookie first
  const cookieValue = request.cookies.get(ADMIN_COOKIE)?.value;
  if (cookieValue && cookieValue === adminKey) return true;

  // Fallback to x-admin-key header (for programmatic access)
  const headerValue = request.headers.get("x-admin-key");
  if (headerValue && headerValue === adminKey) return true;

  return false;
}

/**
 * Set the admin session cookie on a response.
 * httpOnly, sameSite strict, secure in production.
 */
export function setAdminCookie(response: NextResponse): NextResponse {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return response;

  response.cookies.set(ADMIN_COOKIE, adminKey, {
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

// Keep backward compat alias
export const verifyAdminKey = verifyAdmin;
