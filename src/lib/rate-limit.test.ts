/**
 * Security Tests for Rate Limiting
 *
 * Tests the rate limiting functionality to ensure:
 * - Login attempts are properly limited
 * - Rate limits reset after successful login
 * - Different rate limiters work independently
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  getLoginAttemptsRemaining,
  checkPasswordResetRateLimit,
  checkInvitationRateLimit,
  checkApiRateLimit,
  checkSearchRateLimit,
  checkGlobalRateLimit,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIG,
} from "./rate-limit";

describe("Rate Limiting - Login", () => {
  const testEmail = "test@example.com";
  const testIp = "192.168.1.1";

  beforeEach(async () => {
    // Reset rate limit before each test
    await resetLoginRateLimit(testEmail, testIp);
  });

  it("should allow login attempts within limit", async () => {
    const result = await checkLoginRateLimit(testEmail, testIp);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(RATE_LIMIT_CONFIG.login.points - 1);
  });

  it("should track remaining attempts", async () => {
    // Make 3 attempts
    await checkLoginRateLimit(testEmail, testIp);
    await checkLoginRateLimit(testEmail, testIp);
    await checkLoginRateLimit(testEmail, testIp);

    const remaining = await getLoginAttemptsRemaining(testEmail, testIp);

    expect(remaining).toBe(RATE_LIMIT_CONFIG.login.points - 3);
  });

  it("should block after exceeding limit", async () => {
    // Exhaust all attempts
    for (let i = 0; i < RATE_LIMIT_CONFIG.login.points; i++) {
      await checkLoginRateLimit(testEmail, testIp);
    }

    // Next attempt should be blocked
    const result = await checkLoginRateLimit(testEmail, testIp);

    expect(result.success).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("should reset limit after successful login", async () => {
    // Use some attempts
    await checkLoginRateLimit(testEmail, testIp);
    await checkLoginRateLimit(testEmail, testIp);

    // Simulate successful login
    await resetLoginRateLimit(testEmail, testIp);

    // Should have full attempts again
    const remaining = await getLoginAttemptsRemaining(testEmail, testIp);

    expect(remaining).toBe(RATE_LIMIT_CONFIG.login.points);
  });

  it("should treat different emails independently", async () => {
    const email2 = "other@example.com";

    // Exhaust attempts for first email
    for (let i = 0; i < RATE_LIMIT_CONFIG.login.points; i++) {
      await checkLoginRateLimit(testEmail, testIp);
    }

    // Should be blocked for first email
    const result1 = await checkLoginRateLimit(testEmail, testIp);
    expect(result1.success).toBe(false);

    // Should still work for second email (different IP+email key)
    const result2 = await checkLoginRateLimit(email2, "192.168.1.2");
    expect(result2.success).toBe(true);
  });
});

describe("Rate Limiting - Password Reset", () => {
  const testEmail = "reset@example.com";

  it("should allow password reset requests within limit", async () => {
    const result = await checkPasswordResetRateLimit(testEmail);

    expect(result.success).toBe(true);
    expect(result.remaining).toBeLessThan(RATE_LIMIT_CONFIG.passwordReset.points);
  });

  it("should block after exceeding password reset limit", async () => {
    // Exhaust all attempts
    for (let i = 0; i < RATE_LIMIT_CONFIG.passwordReset.points; i++) {
      await checkPasswordResetRateLimit(testEmail);
    }

    // Next attempt should be blocked
    const result = await checkPasswordResetRateLimit(testEmail);

    expect(result.success).toBe(false);
  });
});

describe("Rate Limiting - Invitations", () => {
  const testEmail = "invite@example.com";

  it("should allow invitation resends within limit", async () => {
    const result = await checkInvitationRateLimit(testEmail);

    expect(result.success).toBe(true);
  });

  it("should block after exceeding invitation limit", async () => {
    // Exhaust all attempts
    for (let i = 0; i < RATE_LIMIT_CONFIG.invitation.points; i++) {
      await checkInvitationRateLimit(testEmail);
    }

    // Next attempt should be blocked
    const result = await checkInvitationRateLimit(testEmail);

    expect(result.success).toBe(false);
  });
});

describe("Rate Limiting - API", () => {
  const testUserId = "user-123";

  it("should allow API requests within limit", async () => {
    const result = await checkApiRateLimit(testUserId);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(RATE_LIMIT_CONFIG.api.points);
  });

  it("should track API request count", async () => {
    // Use a unique user ID to avoid conflicts with other tests
    const uniqueUserId = "api-count-test-user";

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await checkApiRateLimit(uniqueUserId);
    }

    const result = await checkApiRateLimit(uniqueUserId);

    expect(result.success).toBe(true);
    // After 11 requests (10 in loop + 1 check), remaining should be points - 11
    expect(result.remaining).toBe(RATE_LIMIT_CONFIG.api.points - 11);
  });
});

describe("Rate Limiting - Search", () => {
  const testUserId = "search-user-123";

  it("should allow search requests within limit", async () => {
    const result = await checkSearchRateLimit(testUserId);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(RATE_LIMIT_CONFIG.search.points);
  });
});

describe("Rate Limiting - Global", () => {
  const testIp = "10.0.0.1";

  it("should allow global requests within limit", async () => {
    const result = await checkGlobalRateLimit(testIp);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(RATE_LIMIT_CONFIG.global.points);
  });

  it("should handle null IP gracefully", async () => {
    const result = await checkGlobalRateLimit(null);

    expect(result.success).toBe(true);
  });
});

describe("Rate Limit Headers", () => {
  it("should generate correct headers for success", () => {
    const result = {
      success: true,
      limit: 100,
      remaining: 95,
      resetMs: 60000,
    };

    const headers = getRateLimitHeaders(result);

    expect(headers["X-RateLimit-Limit"]).toBe("100");
    expect(headers["X-RateLimit-Remaining"]).toBe("95");
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
    expect(headers["Retry-After"]).toBeUndefined();
  });

  it("should include Retry-After for blocked requests", () => {
    const result = {
      success: false,
      limit: 5,
      remaining: 0,
      resetMs: 900000,
      retryAfterSeconds: 900,
    };

    const headers = getRateLimitHeaders(result);

    expect(headers["Retry-After"]).toBe("900");
  });
});

describe("Email Normalization", () => {
  it("should treat uppercase and lowercase emails the same", async () => {
    const email1 = "Test@Example.com";
    const email2 = "test@example.com";
    const ip = "192.168.2.1";

    // Reset both
    await resetLoginRateLimit(email1, ip);
    await resetLoginRateLimit(email2, ip);

    // Make attempt with uppercase
    await checkLoginRateLimit(email1, ip);

    // Should see the attempt when checking lowercase
    const remaining1 = await getLoginAttemptsRemaining(email1, ip);
    const remaining2 = await getLoginAttemptsRemaining(email2, ip);

    expect(remaining1).toBe(remaining2);
  });
});

describe("IP Normalization", () => {
  it("should handle IPv6 localhost", async () => {
    const email = "ipv6@example.com";
    const ip = "::1";

    const result = await checkLoginRateLimit(email, ip);

    expect(result.success).toBe(true);
  });

  it("should handle IPv4-mapped IPv6", async () => {
    const email = "mapped@example.com";
    const ip = "::ffff:192.168.1.1";

    const result = await checkLoginRateLimit(email, ip);

    expect(result.success).toBe(true);
  });
});
