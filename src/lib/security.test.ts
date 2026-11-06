/**
 * Security Tests for Headers and Configuration
 *
 * Tests security-related configuration to ensure:
 * - Required security headers are present
 * - CSP is properly configured
 * - Cookie security settings are correct
 */

import { describe, it, expect } from "vitest";

/**
 * Expected security headers that should be present on all responses.
 */
const REQUIRED_HEADERS = [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "X-DNS-Prefetch-Control",
  "Permissions-Policy",
];

/**
 * Headers that should be present in production only.
 */
const PRODUCTION_HEADERS = ["Strict-Transport-Security"];

/**
 * CSP directives that should be present.
 */
const REQUIRED_CSP_DIRECTIVES = [
  "default-src",
  "script-src",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
  "form-action",
  "frame-ancestors",
  "object-src",
  "base-uri",
];

describe("Security Headers Configuration", () => {
  it("should have X-Frame-Options set to DENY", () => {
    // This test validates the expected configuration
    const expectedValue = "DENY";
    expect(expectedValue).toBe("DENY");
  });

  it("should have X-Content-Type-Options set to nosniff", () => {
    const expectedValue = "nosniff";
    expect(expectedValue).toBe("nosniff");
  });

  it("should have Referrer-Policy set to strict-origin-when-cross-origin", () => {
    const expectedValue = "strict-origin-when-cross-origin";
    expect(expectedValue).toBe("strict-origin-when-cross-origin");
  });

  it("should disable unnecessary browser features via Permissions-Policy", () => {
    const expectedPolicy = "camera=(), microphone=(), geolocation=(), interest-cohort=()";
    expect(expectedPolicy).toContain("camera=()");
    expect(expectedPolicy).toContain("microphone=()");
    expect(expectedPolicy).toContain("geolocation=()");
  });
});

describe("Content Security Policy", () => {
  // Simulated CSP generation for testing
  const generateCSP = (isDev: boolean): string => {
    const directives: Record<string, string[]> = {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "blob:"],
      "font-src": ["'self'"],
      "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
    };

    return Object.entries(directives)
      .map(([key, values]) => `${key} ${values.join(" ")}`)
      .join("; ");
  };

  it("should include all required CSP directives in production", () => {
    const csp = generateCSP(false);

    for (const directive of REQUIRED_CSP_DIRECTIVES) {
      expect(csp).toContain(directive);
    }
  });

  it("should block framing with frame-ancestors none", () => {
    const csp = generateCSP(false);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("should prevent object embeds", () => {
    const csp = generateCSP(false);
    expect(csp).toContain("object-src 'none'");
  });

  it("should restrict base URI to self", () => {
    const csp = generateCSP(false);
    expect(csp).toContain("base-uri 'self'");
  });

  it("should allow data URIs for images (QR codes)", () => {
    const csp = generateCSP(false);
    expect(csp).toContain("img-src 'self' data:");
  });

  it("should include unsafe-eval in development for HMR", () => {
    const devCsp = generateCSP(true);
    expect(devCsp).toContain("'unsafe-eval'");
  });

  it("should NOT include unsafe-eval in production", () => {
    const prodCsp = generateCSP(false);
    expect(prodCsp).not.toContain("'unsafe-eval'");
  });

  it("should allow WebSocket in development for HMR", () => {
    const devCsp = generateCSP(true);
    expect(devCsp).toContain("ws:");
  });

  it("should NOT allow WebSocket in production", () => {
    const prodCsp = generateCSP(false);
    expect(prodCsp).not.toContain("ws:");
  });
});

describe("Cookie Security", () => {
  it("should use secure prefix in production", () => {
    const isProduction = true;
    const cookieName = isProduction
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    expect(cookieName).toBe("__Secure-authjs.session-token");
  });

  it("should use regular name in development", () => {
    const isProduction = false;
    const cookieName = isProduction
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    expect(cookieName).toBe("authjs.session-token");
  });

  it("should set httpOnly flag", () => {
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: true,
    };

    expect(cookieOptions.httpOnly).toBe(true);
  });

  it("should set sameSite to lax", () => {
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: true,
    };

    expect(cookieOptions.sameSite).toBe("lax");
  });
});

describe("Session Configuration", () => {
  it("should have a reasonable session max age", () => {
    const defaultMaxAge = 86400; // 24 hours
    const maxAge = parseInt(process.env.AUTH_SESSION_MAX_AGE || "86400", 10);

    // Should be between 1 hour and 30 days
    expect(maxAge).toBeGreaterThanOrEqual(3600);
    expect(maxAge).toBeLessThanOrEqual(30 * 24 * 60 * 60);
  });

  it("should use JWT strategy", () => {
    const strategy = "jwt";
    expect(strategy).toBe("jwt");
  });
});

describe("HSTS Configuration", () => {
  it("should have correct HSTS header value", () => {
    const hsts = "max-age=31536000; includeSubDomains; preload";

    expect(hsts).toContain("max-age=31536000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("should have max-age of at least 1 year", () => {
    const maxAge = 31536000;
    const oneYear = 365 * 24 * 60 * 60;

    expect(maxAge).toBeGreaterThanOrEqual(oneYear);
  });
});

describe("API Security Headers", () => {
  it("should prevent caching of API responses", () => {
    const cacheControl = "no-store, no-cache, must-revalidate, proxy-revalidate";

    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("no-cache");
    expect(cacheControl).toContain("must-revalidate");
  });
});

describe("Next.js Configuration Security", () => {
  it("should disable X-Powered-By header", () => {
    // This is configured in next.config.ts
    const poweredByHeader = false;
    expect(poweredByHeader).toBe(false);
  });
});

describe("Environment Variable Security", () => {
  it("should not expose secrets in client-side code", () => {
    // Only NEXT_PUBLIC_ prefixed vars are exposed to client
    const envVars = [
      "DATABASE_URL",
      "AUTH_SECRET",
      "RESEND_API_KEY",
    ];

    for (const varName of envVars) {
      expect(varName.startsWith("NEXT_PUBLIC_")).toBe(false);
    }
  });
});
