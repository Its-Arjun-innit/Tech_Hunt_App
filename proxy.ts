import { NextResponse, type NextRequest } from "next/server";

const STUDENT_COOKIE = "ch_student";
const STAFF_COOKIE = "ch_staff";

const STUDENT_PATHS = ["/home", "/timetable", "/mark", "/attendance", "/notices", "/profile", "/a"];

/**
 * Cheap redirect for a missing cookie so signed-out users do not flash a page
 * shell. Real authorization always happens server-side in requireStudent /
 * requireStaff; this is UX only.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const needsStaff = pathname.startsWith("/teacher") || pathname.startsWith("/admin");
  if (needsStaff && !request.cookies.has(STAFF_COOKIE)) {
    return NextResponse.redirect(new URL("/staff/login", request.url));
  }

  const needsStudent = STUDENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (needsStudent && !request.cookies.has(STUDENT_COOKIE)) {
    const url = new URL("/login", request.url);
    // Keep ?c= so a student who scanned the QR with the phone camera lands
    // back on the mark screen after signing in.
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home",
    "/timetable/:path*",
    "/mark/:path*",
    "/attendance/:path*",
    "/notices/:path*",
    "/profile",
    "/a/:path*",
    "/teacher/:path*",
    "/admin/:path*",
  ],
};
