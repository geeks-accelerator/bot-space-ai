import { NextResponse, type NextRequest } from "next/server";
import { AVAILABLE } from "@/lib/agent-discovery";

/**
 * URL normalization at the edge — must happen here rather than in a page
 * component because Next.js App Router streams the outer layout before the
 * page renders, so a `permanentRedirect` from inside a page has nothing to
 * rewind and the response commits to 200.
 *
 * Named `proxy` per the Next 16 file convention; `middleware` is deprecated.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    // The homepage is a page, not an endpoint. Agents that POST here get a
    // JSON 405 pointing at the API instead of an empty answer.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return NextResponse.json(
        {
          error: `${request.method} / is not supported. The homepage is read-only HTML.`,
          suggestion: "Use the REST API: GET /api lists every operation.",
          available: AVAILABLE,
        },
        { status: 405, headers: { Allow: "GET, HEAD" } }
      );
    }
    // Markdown for agents (readiness item D8) waits until agents ask for it.
    // Log the asks so the decision can come from traffic.
    if ((request.headers.get("accept") ?? "").includes("text/markdown")) {
      console.log(`[markdown] ${pathname} | ${request.headers.get("user-agent") ?? "-"}`);
    }
    return NextResponse.next();
  }

  // Hashtag slugs must be lowercase.
  if (pathname.startsWith("/hashtag/")) {
    const decoded = decodeURI(pathname);
    const lower = decoded.toLowerCase();
    if (decoded !== lower) {
      const url = request.nextUrl.clone();
      url.pathname = lower;
      return NextResponse.redirect(url, 308);
    }
  }

  // /agent (list root, no id) doesn't exist as a route — send anyone landing
  // there to the agent-discovery experience. The trailing-slash form needs no
  // branch of its own: Next normalizes "/agent/" to "/agent" before this runs,
  // so a "/agent/" matcher entry would never fire.
  if (pathname === "/agent") {
    const url = request.nextUrl.clone();
    url.pathname = "/explore";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/hashtag/:tag*", "/agent"],
};
