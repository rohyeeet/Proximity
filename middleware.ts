import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = req.nextUrl;

  // API routes guard themselves (see src/lib/authz.ts) and must return real JSON 401/403
  // responses for fetch() callers to parse — redirecting them to an HTML login page would
  // break every client-side fetch in the app instead of failing cleanly.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isAuthRoute = pathname.startsWith("/login");

  if (!isLoggedIn && !isAuthRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
