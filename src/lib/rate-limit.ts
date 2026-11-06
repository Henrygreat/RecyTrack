/**
 * Rate Limiting Library
 *
 * Provides application-level rate limiting using in-memory storage.
 * Can be upgraded to Redis for distributed deployments.
 *
 * SECURITY: This module protects against:
 * - Brute-force login attacks
 * - API abuse
 * - Credential stuffing
 * - Resource exhaustion
 */

import {
  RateLimiterMemory,
  RateLimiterRes,
} from "rate-limiter-flexible";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Rate limiter configurations for different endpoints.
 * Adjust these values based on expected usage patterns.
 */
const RATE_LIMIT_CONFIG = {
  // Login: 5 attempts per 15 minutes per IP+email combination
  login: {
    points: 5,
    duration: 15 * 60, // 15 minutes
    blockDuration: 15 * 60, // Block for 15 minutes after exhaustion
  },

  // Login by IP only: 20 attempts per 15 minutes (catches distributed attacks)
  loginByIp: {
    points: 20,
    duration: 15 * 60,
    blockDuration: 15 * 60,
  },

  // Password reset requests: 3 per hour per email
  passwordReset: {
    points: 3,
    duration: 60 * 60, // 1 hour
    blockDuration: 60 * 60,
  },

  // Invitation resends: 3 per hour per email
  invitation: {
    points: 3,
    duration: 60 * 60,
    blockDuration: 60 * 60,
  },

  // API requests: 100 per minute per user
  api: {
    points: 100,
    duration: 60,
    blockDuration: 60,
  },

  // Search requests: 30 per minute per user
  search: {
    points: 30,
    duration: 60,
    blockDuration: 60,
  },

  // Global fallback: 1000 requests per minute per IP
  global: {
    points: 1000,
    duration: 60,
    blockDuration: 0, // No block, just rate limit
  },
} as const;

// =============================================================================
// RATE LIMITERS (In-Memory)
// =============================================================================

/**
 * In-memory rate limiters.
 * Note: These reset on server restart. For production with multiple instances,
 * consider upgrading to Redis using RateLimiterRedis.
 */

const loginLimiter = new RateLimiterMemory({
  keyPrefix: "login",
  points: RATE_LIMIT_CONFIG.login.points,
  duration: RATE_LIMIT_CONFIG.login.duration,
  blockDuration: RATE_LIMIT_CONFIG.login.blockDuration,
});

const loginByIpLimiter = new RateLimiterMemory({
  keyPrefix: "login_ip",
  points: RATE_LIMIT_CONFIG.loginByIp.points,
  duration: RATE_LIMIT_CONFIG.loginByIp.duration,
  blockDuration: RATE_LIMIT_CONFIG.loginByIp.blockDuration,
});

const passwordResetLimiter = new RateLimiterMemory({
  keyPrefix: "pwd_reset",
  points: RATE_LIMIT_CONFIG.passwordReset.points,
  duration: RATE_LIMIT_CONFIG.passwordReset.duration,
  blockDuration: RATE_LIMIT_CONFIG.passwordReset.blockDuration,
});

const invitationLimiter = new RateLimiterMemory({
  keyPrefix: "invitation",
  points: RATE_LIMIT_CONFIG.invitation.points,
  duration: RATE_LIMIT_CONFIG.invitation.duration,
  blockDuration: RATE_LIMIT_CONFIG.invitation.blockDuration,
});

const apiLimiter = new RateLimiterMemory({
  keyPrefix: "api",
  points: RATE_LIMIT_CONFIG.api.points,
  duration: RATE_LIMIT_CONFIG.api.duration,
  blockDuration: RATE_LIMIT_CONFIG.api.blockDuration,
});

const searchLimiter = new RateLimiterMemory({
  keyPrefix: "search",
  points: RATE_LIMIT_CONFIG.search.points,
  duration: RATE_LIMIT_CONFIG.search.duration,
  blockDuration: RATE_LIMIT_CONFIG.search.blockDuration,
});

const globalLimiter = new RateLimiterMemory({
  keyPrefix: "global",
  points: RATE_LIMIT_CONFIG.global.points,
  duration: RATE_LIMIT_CONFIG.global.duration,
  blockDuration: RATE_LIMIT_CONFIG.global.blockDuration,
});

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize email for consistent rate limiting.
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize IP address, handling proxied requests.
 */
function normalizeIp(ip: string | null): string {
  if (!ip) return "unknown";
  // Handle IPv6 localhost
  if (ip === "::1") return "127.0.0.1";
  // Handle IPv4-mapped IPv6
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

/**
 * Convert RateLimiterRes to our result type.
 */
function toResult(
  res: RateLimiterRes,
  config: { points: number }
): RateLimitResult {
  return {
    success: true,
    limit: config.points,
    remaining: Math.max(0, res.remainingPoints),
    resetMs: res.msBeforeNext,
  };
}

/**
 * Convert rejection to our result type.
 */
function toRejection(
  res: RateLimiterRes,
  config: { points: number }
): RateLimitResult {
  return {
    success: false,
    limit: config.points,
    remaining: 0,
    resetMs: res.msBeforeNext,
    retryAfterSeconds: Math.ceil(res.msBeforeNext / 1000),
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check and consume rate limit for login attempts.
 * Uses both IP+email and IP-only limiting for defense in depth.
 *
 * @param email - User email attempting login
 * @param ip - Client IP address
 * @returns Rate limit result
 */
export async function checkLoginRateLimit(
  email: string,
  ip: string | null
): Promise<RateLimitResult> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIp(ip);
  const key = `${normalizedIp}:${normalizedEmail}`;

  try {
    // Check IP-only limit first (catches distributed attacks)
    const ipResult = await loginByIpLimiter.consume(normalizedIp);

    // Then check IP+email combination
    const result = await loginLimiter.consume(key);

    return toResult(result, RATE_LIMIT_CONFIG.login);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return toRejection(error, RATE_LIMIT_CONFIG.login);
    }
    // On unexpected errors, allow the request (fail open for availability)
    console.error("Rate limit check failed:", error);
    return {
      success: true,
      limit: RATE_LIMIT_CONFIG.login.points,
      remaining: 1,
      resetMs: 0,
    };
  }
}

/**
 * Reset login rate limit on successful login.
 * This prevents legitimate users from being locked out after successful auth.
 *
 * @param email - User email that successfully logged in
 * @param ip - Client IP address
 */
export async function resetLoginRateLimit(
  email: string,
  ip: string | null
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIp(ip);
  const key = `${normalizedIp}:${normalizedEmail}`;

  try {
    await loginLimiter.delete(key);
    // Note: We don't reset IP-only limit to maintain protection against
    // attackers who might guess one valid credential
  } catch (error) {
    console.error("Failed to reset login rate limit:", error);
  }
}

/**
 * Get remaining login attempts without consuming.
 * Useful for displaying warning to users.
 *
 * @param email - User email
 * @param ip - Client IP address
 * @returns Number of remaining attempts or null if not limited
 */
export async function getLoginAttemptsRemaining(
  email: string,
  ip: string | null
): Promise<number | null> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIp(ip);
  const key = `${normalizedIp}:${normalizedEmail}`;

  try {
    const result = await loginLimiter.get(key);
    if (!result) return RATE_LIMIT_CONFIG.login.points;
    return Math.max(0, RATE_LIMIT_CONFIG.login.points - result.consumedPoints);
  } catch (error) {
    console.error("Failed to get login attempts:", error);
    return null;
  }
}

/**
 * Check rate limit for password reset requests.
 *
 * @param email - Email requesting password reset
 * @returns Rate limit result
 */
export async function checkPasswordResetRateLimit(
  email: string
): Promise<RateLimitResult> {
  const normalizedEmail = normalizeEmail(email);

  try {
    const result = await passwordResetLimiter.consume(normalizedEmail);
    return toResult(result, RATE_LIMIT_CONFIG.passwordReset);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return toRejection(error, RATE_LIMIT_CONFIG.passwordReset);
    }
    console.error("Password reset rate limit check failed:", error);
    return {
      success: true,
      limit: RATE_LIMIT_CONFIG.passwordReset.points,
      remaining: 1,
      resetMs: 0,
    };
  }
}

/**
 * Check rate limit for invitation resends.
 *
 * @param email - Email being invited
 * @returns Rate limit result
 */
export async function checkInvitationRateLimit(
  email: string
): Promise<RateLimitResult> {
  const normalizedEmail = normalizeEmail(email);

  try {
    const result = await invitationLimiter.consume(normalizedEmail);
    return toResult(result, RATE_LIMIT_CONFIG.invitation);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return toRejection(error, RATE_LIMIT_CONFIG.invitation);
    }
    console.error("Invitation rate limit check failed:", error);
    return {
      success: true,
      limit: RATE_LIMIT_CONFIG.invitation.points,
      remaining: 1,
      resetMs: 0,
    };
  }
}

/**
 * Check rate limit for API requests.
 *
 * @param userId - Authenticated user ID
 * @returns Rate limit result
 */
export async function checkApiRateLimit(
  userId: string
): Promise<RateLimitResult> {
  try {
    const result = await apiLimiter.consume(userId);
    return toResult(result, RATE_LIMIT_CONFIG.api);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return toRejection(error, RATE_LIMIT_CONFIG.api);
    }
    console.error("API rate limit check failed:", error);
    return {
      success: true,
      limit: RATE_LIMIT_CONFIG.api.points,
      remaining: 1,
      resetMs: 0,
    };
  }
}

/**
 * Check rate limit for search requests.
 *
 * @param userId - Authenticated user ID
 * @returns Rate limit result
 */
export async function checkSearchRateLimit(
  userId: string
): Promise<RateLimitResult> {
  try {
    const result = await searchLimiter.consume(userId);
    return toResult(result, RATE_LIMIT_CONFIG.search);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return toRejection(error, RATE_LIMIT_CONFIG.search);
    }
    console.error("Search rate limit check failed:", error);
    return {
      success: true,
      limit: RATE_LIMIT_CONFIG.search.points,
      remaining: 1,
      resetMs: 0,
    };
  }
}

/**
 * Check global rate limit by IP.
 *
 * @param ip - Client IP address
 * @returns Rate limit result
 */
export async function checkGlobalRateLimit(
  ip: string | null
): Promise<RateLimitResult> {
  const normalizedIp = normalizeIp(ip);

  try {
    const result = await globalLimiter.consume(normalizedIp);
    return toResult(result, RATE_LIMIT_CONFIG.global);
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return toRejection(error, RATE_LIMIT_CONFIG.global);
    }
    console.error("Global rate limit check failed:", error);
    return {
      success: true,
      limit: RATE_LIMIT_CONFIG.global.points,
      remaining: 1,
      resetMs: 0,
    };
  }
}

/**
 * Get rate limit headers for HTTP responses.
 *
 * @param result - Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000 + result.resetMs / 1000)),
  };

  if (result.retryAfterSeconds) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}

// Export configuration for testing
export { RATE_LIMIT_CONFIG };
