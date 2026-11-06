"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  getLoginAttemptsRemaining,
} from "@/lib/rate-limit";

export type LoginState = {
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
  attemptsRemaining?: number;
};

/**
 * Extract client IP from request headers.
 * Handles various proxy configurations (Cloudflare, Nginx, etc.)
 */
async function getClientIp(): Promise<string | null> {
  const headersList = await headers();

  // Cloudflare
  const cfIp = headersList.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Standard proxy headers
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP (original client)
    return forwardedFor.split(",")[0].trim();
  }

  // Nginx real IP
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp;

  return null;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const emailStr = String(email).toLowerCase().trim();
  const clientIp = await getClientIp();

  // Check rate limit BEFORE attempting authentication
  const rateLimit = await checkLoginRateLimit(emailStr, clientIp);

  if (!rateLimit.success) {
    // User is rate limited
    return {
      error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      rateLimited: true,
      retryAfter: rateLimit.retryAfterSeconds,
    };
  }

  // Get remaining attempts for user feedback
  const attemptsRemaining = await getLoginAttemptsRemaining(emailStr, clientIp);

  try {
    // Redirect to auth callback which determines the correct destination
    // based on user's access type (staff vs customer)
    await signIn("credentials", {
      email: emailStr,
      password: String(password),
      redirectTo: "/auth/callback",
    });

    // signIn redirects on success, so this line is never reached
    // But if it somehow does, reset rate limit
    await resetLoginRateLimit(emailStr, clientIp);
    return {};
  } catch (error) {
    // Auth.js uses Next.js redirect internally - preserve it
    if (isRedirectError(error)) {
      // Successful login - reset rate limit
      await resetLoginRateLimit(emailStr, clientIp);
      throw error;
    }

    // Handle Auth.js authentication errors
    if (error instanceof AuthError) {
      // Include remaining attempts in error response
      const remaining = attemptsRemaining ?? rateLimit.remaining;
      const warningMsg = remaining <= 2 && remaining > 0
        ? ` (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)`
        : "";

      switch (error.type) {
        case "CredentialsSignin":
          return {
            error: `Invalid email or password${warningMsg}`,
            attemptsRemaining: remaining,
          };
        case "CallbackRouteError":
          return {
            error: `Authentication failed. Please try again.${warningMsg}`,
            attemptsRemaining: remaining,
          };
        default:
          return {
            error: `An authentication error occurred${warningMsg}`,
            attemptsRemaining: remaining,
          };
      }
    }

    // Unknown errors
    console.error("Login error:", error);
    return { error: "An unexpected error occurred" };
  }
}
