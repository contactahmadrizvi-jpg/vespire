import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/firebase/constants";

/**
 * Route-protection middleware.
 *
 * The session cookie is set client-side by the AuthProvider whenever
 * `onAuthStateChanged` reports a logged-in user (and also explicitly
 * after each sign-in call so the cookie exists before any redirect).
 *
 * The middleware cannot verify the Firebase token (that requires the
 * Admin SDK), so it simply checks for cookie *presence*.  The real
 * auth check still happens client-side via the auth context.
 */

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = !!request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // ── Protected routes: /dashboard/** ──────────────────────────────
  const isProtected =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Auth routes: redirect logged-in users to dashboard ──────────
  if (AUTH_ROUTES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on routes that actually need session checks.
  // Explicitly exclude the Shopify OAuth flow (/install, /api/auth/*)
  // so those routes are never blocked by the Firebase session guard.
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
  ],
};
