import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { locales } from "./navigation";
import { defaultLocale } from "./i18n";

// Create the base middleware with next-intl
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true, // Enable automatic detection via cookie
});

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Log all requests for debugging
  console.log("[Middleware] Request:", pathname);

  // Generate a nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Build connect-src URLs properly
  const backendUrl = process.env.BACKEND_URL || "";
  const wsUrl = backendUrl
    ? backendUrl.replace("https", "wss").replace("http", "ws")
    : "";

  // Create CSP header with nonce
  const connectSrcUrls = [
    "'self'",
    backendUrl,
    wsUrl,
    "https://*.stripe.com",
    "https://api.ipify.org",
    "https://nominatim.openstreetmap.org",
    "https://auth.revsticks.ch",
  ]
    .filter(Boolean)
    .join(" ");

  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${
      process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""
    } https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://minio-api.cwx-dev.com https://*.fbcdn.net data: blob:",
    "media-src 'self' https://minio-api.cwx-dev.com blob:",
    `connect-src ${connectSrcUrls}`,
    "font-src 'self'",
    "object-src 'none'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://auth.revsticks.ch",
    "child-src 'self' https://js.stripe.com",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    ...(process.env.NODE_ENV === "development"
      ? []
      : ["upgrade-insecure-requests"]),
  ].join("; ");

  // console.log('CSP Header:', cspHeader);

  // Set up request headers with nonce and CSP
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // Security headers from next.config.ts
  const securityHeaders = {
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-DNS-Prefetch-Control": "on",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    // Performance headers
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "Accept-CH": "Viewport-Width, Width",
    "Critical-CH": "Viewport-Width, Width",
  };

  // Add all security headers to the request
  Object.entries(securityHeaders).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });

  const BACKEND_URL = process.env.BACKEND_URL;

  // Skip health check for maintenance page itself to prevent redirect loops
  const isMaintenancePage = /\/[^/]+\/maintenance/.test(pathname);

  // Don't perform health check for the life-check endpoint itself
  const isLifeCheckEndpoint = pathname === "/life-check";

  // Skip health check for admin routes
  const isProtectedRoute = /\/[^/]+\/(admin|account|history)/.test(pathname);

  // Check if we're not already on the maintenance page, life-check endpoint, or protected route
  if (
    !isMaintenancePage &&
    !isLifeCheckEndpoint &&
    !isProtectedRoute &&
    BACKEND_URL
  ) {
    try {
      // Check if the service is available by checking life-check endpoint
      const healthCheckUrl = new URL("/life-check", BACKEND_URL);
      const healthResponse = await fetch(healthCheckUrl.toString(), {
        signal: AbortSignal.timeout(5000),
        headers: {
          Accept: "text/plain",
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
      });

      if (healthResponse.ok) {
        const healthResult = await healthResponse.text();
        console.log(`Health check response: "${healthResult}"`);

        // Only redirect if the response is NOT "Hello" (case-sensitive)
        if (healthResult !== "Hello") {
          const locale = getLocaleFromRequest(request);
          const maintenanceUrl = new URL(
            `/${locale}/maintenance`,
            request.nextUrl.origin,
          );
          return NextResponse.redirect(maintenanceUrl);
        }
      } else {
        // Response not OK, redirect to maintenance
        const locale = getLocaleFromRequest(request);
        const maintenanceUrl = new URL(
          `/${locale}/maintenance`,
          request.nextUrl.origin,
        );
        return NextResponse.redirect(maintenanceUrl);
      }
    } catch (error) {
      console.error("Health check error:", error);
      // If the health check request fails (e.g., network error, timeout), redirect to maintenance
      const locale = getLocaleFromRequest(request);
      const maintenanceUrl = new URL(
        `/${locale}/maintenance`,
        request.nextUrl.origin,
      );
      return NextResponse.redirect(maintenanceUrl);
    }
  }

  // Check if the request is for a path without locale
  const pathnameIsMissingLocale = locales.every(
    (locale) =>
      !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  // If the request is for any path without locale, try to redirect based on stored preferences
  if (pathnameIsMissingLocale) {
    // Priority 1: Cookie (set by LanguageSwitcher)
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
    console.log("[Middleware] Cookie locale:", cookieLocale);

    let redirectLocale = defaultLocale; // Default to English

    // Check if we have a valid locale cookie
    if (
      cookieLocale &&
      locales.includes(cookieLocale as (typeof locales)[number])
    ) {
      redirectLocale = cookieLocale;
      console.log("[Middleware] Using cookie locale:", redirectLocale);
    } else {
      // Priority 2: Accept-Language header
      const acceptLanguage = request.headers.get("Accept-Language");
      console.log("[Middleware] Accept-Language:", acceptLanguage);
      if (acceptLanguage) {
        const userLocales = acceptLanguage
          .split(",")
          .map((lang) =>
            lang.split(";")[0].trim().substring(0, 2).toLowerCase(),
          );

        // Use browser language if it matches our supported locales
        for (const userLocale of userLocales) {
          if (locales.includes(userLocale as (typeof locales)[number])) {
            redirectLocale = userLocale;
            console.log(
              "[Middleware] Using Accept-Language locale:",
              redirectLocale,
            );
            break;
          }
        }
      }

      if (redirectLocale === defaultLocale) {
        console.log("[Middleware] Using default locale:", redirectLocale);
      }
    }

    // Create a new URL object to properly handle parameters
    const newUrl = new URL(request.url);

    // Modify the pathname to include the locale
    newUrl.pathname = `/${redirectLocale}${pathname === "/" ? "" : pathname}`;

    // Redirect to the new URL (parameters are preserved automatically)
    const response = NextResponse.redirect(newUrl);

    // Set or refresh the cookie with correct sameSite
    response.cookies.set("NEXT_LOCALE", redirectLocale, {
      maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
      path: "/",
      sameSite: "lax",
    });

    // Add CSP and security headers to response
    response.headers.set("Content-Security-Policy", cspHeader);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // For all other cases, use next-intl middleware with CSP headers
  const response = await intlMiddleware(
    new NextRequest(request.url, {
      headers: requestHeaders,
      method: request.method,
      body: request.body,
      signal: request.signal,
    }),
  );

  // Add CSP and security headers to the final response
  response.headers.set("Content-Security-Policy", cspHeader);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Helper function to get locale from request
function getLocaleFromRequest(request: NextRequest): string {
  // 1. First priority: try to get locale from cookie (set by LanguageSwitcher)
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (
    cookieLocale &&
    locales.includes(cookieLocale as (typeof locales)[number])
  ) {
    return cookieLocale;
  }

  // 2. Second priority: try to get from localStorage preference via custom header
  // (This will be set by the client-side code when available)
  const localStorageLocale = request.headers.get("x-preferred-locale");
  if (
    localStorageLocale &&
    locales.includes(localStorageLocale as (typeof locales)[number])
  ) {
    return localStorageLocale;
  }

  // 3. Third priority: try to get locale from Accept-Language header
  const acceptLanguage = request.headers.get("Accept-Language");
  if (acceptLanguage) {
    // Parse the Accept-Language header and find the first matching locale
    const userLocales = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim().substring(0, 2).toLowerCase());

    for (const userLocale of userLocales) {
      if (locales.includes(userLocale as (typeof locales)[number])) {
        return userLocale;
      }
    }
  }

  // 4. Fall back to default locale
  return defaultLocale;
}

// Configure middleware to match all routes
export const config = {
  // Match all request paths except for:
  // - API routes (/api/*)
  // - Static files (e.g., images, JS, CSS)
  // - Public files (in /public folder)
  // - _next and _vercel internal paths
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
