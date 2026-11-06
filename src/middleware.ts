/**
 * Next.js Middleware for Security Headers
 *
 * This middleware adds security headers to all responses.
 * It runs on the Edge runtime for optimal performance.
 *
 * SECURITY: Implements OWASP recommended headers including:
 * - Content-Security-Policy (CSP)
 * - Strict-Transport-Security (HSTS)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - Referrer-Policy
 * - Permissions-Policy
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Generate Content-Security-Policy header value.
 *
 * IMPORTANT: This CSP is designed to work with Next.js while providing
 * strong security. It uses 'unsafe-inline' for scripts and styles because
 * Next.js injects inline scripts for hydration.
 *
 * For maximum security, consider implementing nonce-based CSP in the future.
 */
function getCSPHeader(isDev: boolean): string {
  const directives: Record<string, string[]> = {
    // Default fallback - only allow same origin
    "default-src": ["'self'"],

    // Scripts - self + inline (required for Next.js)
    // In production, consider using nonces for stronger security
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Required for Next.js inline scripts
      ...(isDev ? ["'unsafe-eval'"] : []), // Required for Next.js HMR in dev
    ],

    // Styles - self + inline (required for Tailwind and component styles)
    "style-src": ["'self'", "'unsafe-inline'"],

    // Images - self + data URIs (for inline images/QR codes)
    "img-src": ["'self'", "data:", "blob:"],

    // Fonts - self only
    "font-src": ["'self'"],

    // Connect (XHR/fetch) - self only
    "connect-src": [
      "'self'",
      ...(isDev ? ["ws:", "wss:"] : []), // WebSocket for HMR in dev
    ],

    // Forms - self only (all forms submit to same origin)
    "form-action": ["'self'"],

    // Frame ancestors - none (prevents clickjacking)
    "frame-ancestors": ["'none'"],

    // Object/embed - none (no plugins)
    "object-src": ["'none'"],

    // Base URI - self only (prevents base tag injection)
    "base-uri": ["'self'"],

    // Upgrade insecure requests in production
    ...(!isDev ? { "upgrade-insecure-requests": [] } : {}),
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");
}

/**
 * Security headers to apply to all responses.
 */
function getSecurityHeaders(isDev: boolean): Record<string, string> {
  return {
    // Content Security Policy
    "Content-Security-Policy": getCSPHeader(isDev),

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Prevent clickjacking
    "X-Frame-Options": "DENY",

    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // HTTP Strict Transport Security
    // Only in production (causes issues with localhost)
    ...(!isDev
      ? {
          "Strict-Transport-Security":
            "max-age=31536000; includeSubDomains; preload",
        }
      : {}),

    // Permissions Policy - disable unnecessary browser features
    "Permissions-Policy": [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()", // Disable FLoC
    ].join(", "),

    // Prevent browsers from performing DNS prefetching
    "X-DNS-Prefetch-Control": "off",

    // Prevent browsers from downloading files in wrong context
    "X-Download-Options": "noopen",

    // Enable XSS filter (legacy, but doesn't hurt)
    "X-XSS-Protection": "1; mode=block",
  };
}

/**
 * Paths that should skip security header processing.
 * These are internal Next.js paths that don't need modification.
 */
const SKIP_PATHS = [
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js paths
  if (SKIP_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Determine if we're in development
  const isDev = process.env.NODE_ENV === "development";

  // Get the response
  const response = NextResponse.next();

  // Add security headers
  const headers = getSecurityHeaders(isDev);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Configure which paths the middleware runs on.
 * We want it on all paths except static files.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
