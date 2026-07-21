import { NextResponse, type NextRequest } from "next/server";

/**
 * URL normalization at the edge — must happen here rather than in a page
 * component because Next.js App Router streams the outer layout before the
 * page renders, so a `permanentRedirect` from inside a page has nothing to
 * rewind and the response commits to 200.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/hashtag/:tag*"],
};
