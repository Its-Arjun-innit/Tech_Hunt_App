import { NextResponse, type NextRequest } from "next/server";

const PLAYER_COOKIE = "th_player";
const ADMIN_COOKIE = "th_admin";

/**
 * Cheap redirect for a missing cookie so signed-out users do not flash a page
 * shell. Real authorization always happens server-side in requirePlayer /
 * requireAdmin; this is UX only.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAdmin =
    (pathname.startsWith("/admin") && pathname !== "/admin/login") ||
    (pathname.startsWith("/volunteer") && pathname !== "/volunteer/login");

  if (needsAdmin && !request.cookies.has(ADMIN_COOKIE)) {
    const target = pathname.startsWith("/volunteer") ? "/volunteer/login" : "/admin/login";
    return NextResponse.redirect(new URL(target, request.url));
  }

  const needsPlayer = ["/dashboard", "/scan", "/challenge", "/leaderboard"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsPlayer && !request.cookies.has(PLAYER_COOKIE)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/scan/:path*", "/challenge/:path*", "/leaderboard", "/admin/:path*", "/volunteer/:path*"],
};
