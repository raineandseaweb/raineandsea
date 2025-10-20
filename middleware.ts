import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle geolocation and currency detection
  // Note: request.geo is available on Vercel Edge Runtime
  const country = (request as any).geo?.country || "US";
  const currency = getCurrencyForCountry(country);

  // Add currency and country headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-country", country);
  requestHeaders.set("x-currency", currency);

  // Define protected routes
  const protectedRoutes = ["/account", "/admin"];
  const authRoutes = ["/auth/signin", "/auth/signup"];

  // Check if current path is protected
  // Special handling for /orders: protect /orders but allow /orders/lookup
  const isProtectedRoute =
    protectedRoutes.some((route) => pathname.startsWith(route)) ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/");

  // Allow guest access to /orders/lookup
  const isOrderLookup = pathname === "/orders/lookup";

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !isOrderLookup) {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      // Redirect to signin with return URL
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // For now, just check if token exists
    // JWT verification will be done in API routes
    // This is a simplified approach for Edge Runtime compatibility
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute) {
    const token = request.cookies.get("auth-token")?.value;

    if (token) {
      // If token exists, redirect to home
      // Token validation will be done in API routes
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function getCurrencyForCountry(country: string): string {
  const currencyMap: Record<string, string> = {
    US: "USD",
    CA: "CAD",
    GB: "GBP",
    EU: "EUR",
    AU: "AUD",
    JP: "JPY",
  };

  return currencyMap[country] || "USD";
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
