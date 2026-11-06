"use server";

import { prisma } from "@/lib/prisma";
import { checkPasswordResetRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { headers } from "next/headers";
import crypto from "crypto";

/**
 * Token expiration time in milliseconds (30 minutes)
 */
const TOKEN_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * Token length in bytes (will produce 64-char hex string)
 */
const TOKEN_LENGTH_BYTES = 32;

export type ForgotPasswordState = {
  success?: boolean;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
};

/**
 * Generate a cryptographically secure random token.
 * Returns both the raw token (for email) and the hash (for storage).
 */
function generateSecureToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(TOKEN_LENGTH_BYTES).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/**
 * Hash a raw token for lookup/verification.
 * Note: Internal function, not exported as server action.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Extract client IP from request headers.
 */
async function getClientIp(): Promise<string | null> {
  const headersList = await headers();

  // Cloudflare
  const cfIp = headersList.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Standard proxy headers
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Nginx real IP
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp;

  return null;
}

/**
 * Get user agent from request headers.
 */
async function getUserAgent(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("user-agent");
}

/**
 * Request a password reset for the given email address.
 *
 * SECURITY NOTES:
 * - Always returns a generic success message to prevent account enumeration
 * - Rate limited by email address (3 per hour)
 * - Generates cryptographically secure tokens
 * - Stores only the token hash, not the raw token
 * - Invalidates any previous outstanding tokens for the user
 * - Tokens expire after 30 minutes
 */
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get("email");

  if (!email) {
    return { error: "Email address is required" };
  }

  const emailStr = String(email).toLowerCase().trim();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailStr)) {
    return { error: "Please enter a valid email address" };
  }

  // Check rate limit BEFORE any database operations
  const rateLimit = await checkPasswordResetRateLimit(emailStr);

  if (!rateLimit.success) {
    return {
      error: `Too many requests. Please try again in ${Math.ceil((rateLimit.retryAfterSeconds || 60) / 60)} minutes.`,
      rateLimited: true,
      retryAfter: rateLimit.retryAfterSeconds,
    };
  }

  // Get request metadata for audit logging
  const clientIp = await getClientIp();
  const userAgent = await getUserAgent();

  try {
    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: emailStr },
      select: { id: true, name: true, email: true },
    });

    // SECURITY: Always return success regardless of whether user exists
    // This prevents account enumeration attacks
    if (!user) {
      console.log(
        `Password reset requested for non-existent email: ${emailStr.substring(0, 3)}***`
      );
      return {
        success: true,
      };
    }

    // Generate secure token
    const { rawToken, tokenHash } = generateSecureToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    // Invalidate any existing tokens for this user and create new one
    // Using a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Delete all existing tokens for this user (invalidate previous requests)
      await tx.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new token
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          ipAddress: clientIp,
          userAgent: userAgent?.substring(0, 500), // Truncate for storage
        },
      });
    });

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name || "User",
      resetToken: rawToken,
    });

    if (!emailResult.success) {
      console.error(
        `Failed to send password reset email to ${emailStr.substring(0, 3)}***:`,
        emailResult.error
      );
      // Still return success to prevent enumeration
      // In production, you might want to alert operations
    }

    console.log(
      `Password reset token generated for user ${user.id}, expires at ${expiresAt.toISOString()}`
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error processing password reset request:", error);
    // Return generic error to avoid leaking information
    return {
      error: "An error occurred. Please try again later.",
    };
  }
}
