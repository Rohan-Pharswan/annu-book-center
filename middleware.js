import { NextResponse } from "next/server";
import { jwtVerify } from "jose/jwt/verify";


// Routes that require the user to be authenticated
const AUTH_ROUTES = ["/cart", "/orders", "/wishlist", "/profile", "/bookings"];

// Routes that require admin role
const ADMIN_ROUTES = ["/admin"];

// Public-only routes — redirect logged-in users away from login/signup
const PUBLIC_ONLY = ["/login", "/signup"];

function getRedirectUrl(pathname, base) {
  return new URL(pathname, base).toString();
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get("token");
  const token = tokenCookie?.value;

  let payload = null;

  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        // jose uses TextEncoder for the secret — Edge-compatible
        const { payload: decoded } = await jwtVerify(
          token,
          new TextEncoder().encode(secret)
        );
        payload = decoded;
      }
    } catch {
      // Invalid/expired token — treat as unauthenticated
      payload = null;
    }
  }

  const isAuthenticated = Boolean(payload?.userId);
  const isAdmin = isAuthenticated && payload?.role === "admin";

  // 1. Admin routes — must be authenticated AND admin
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2. Auth-required routes — must be authenticated
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 3. Public-only routes — redirect authenticated users to home
  if (PUBLIC_ONLY.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - API routes (those are protected by requireAuth/requireAdmin in the handlers)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)"
  ]
};
