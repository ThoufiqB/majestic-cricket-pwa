import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for route protection
 * 
 * Protected routes:
 * - /admin/* - Requires admin role
 * 
 * Auth is checked via session cookie, but role verification
 * must happen server-side in API routes since middleware
 * can't access Firebase Admin SDK directly.
 * 
 * This middleware:
 * 1. Checks if user has a session cookie
 * 2. For admin routes, redirects to home if no session
 * 3. Role verification happens in the admin pages/APIs
 */

// Routes that require authentication
const PROTECTED_ROUTES = ["/admin"];

// Routes that require admin role (subset of protected)
const ADMIN_ROUTES = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Get session cookie - use same name as sessionLogin API
  const cookieName = process.env.SESSION_COOKIE_NAME || "mc_session";
  const sessionCookie = request.cookies.get(cookieName)?.value;

  // If no session and trying to access protected route, redirect to home
  if (isProtectedRoute && !sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "auth_required");
    return NextResponse.redirect(url);
  }

  // For admin routes, we add a header that pages can check
  // Full role verification must happen in the page/API since
  // middleware can't access Firebase Admin SDK
  if (isAdminRoute && sessionCookie) {
    const response = NextResponse.next();
    response.headers.set("x-admin-route", "true");
    return response;
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
