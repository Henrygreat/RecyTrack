"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Password requirements
 */
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

export type ResetPasswordState = {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    password?: string;
    confirmPassword?: string;
  };
};

export type TokenValidationResult = {
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  error?: string;
};

/**
 * Hash a raw token for lookup/verification.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Validate password meets security requirements.
 */
function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  // Check for at least one letter and one number
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must contain at least one letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  return null;
}

/**
 * Validate a password reset token.
 * Returns validation result without consuming the token.
 */
export async function validateResetToken(
  token: string
): Promise<TokenValidationResult> {
  if (!token || token.length !== 64) {
    return {
      valid: false,
      error: "Invalid reset link",
    };
  }

  try {
    const tokenHash = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!resetToken) {
      return {
        valid: false,
        error: "Invalid or expired reset link",
      };
    }

    // Check if already used
    if (resetToken.usedAt) {
      return {
        valid: false,
        used: true,
        error: "This reset link has already been used",
      };
    }

    // Check if expired
    if (new Date() > resetToken.expiresAt) {
      return {
        valid: false,
        expired: true,
        error: "This reset link has expired",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating reset token:", error);
    return {
      valid: false,
      error: "An error occurred. Please try again.",
    };
  }
}

/**
 * Reset password using a valid token.
 *
 * SECURITY NOTES:
 * - Validates token is not expired or used
 * - Marks token as used atomically with password update
 * - Increments password version to invalidate all existing JWT sessions
 * - Deletes all other outstanding tokens for this user
 */
export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = formData.get("token");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  // Validate inputs
  if (!token) {
    return { error: "Invalid reset link" };
  }

  if (!password || !confirmPassword) {
    return { error: "Password and confirmation are required" };
  }

  const tokenStr = String(token);
  const passwordStr = String(password);
  const confirmPasswordStr = String(confirmPassword);

  // Validate password format
  const passwordError = validatePassword(passwordStr);
  if (passwordError) {
    return {
      fieldErrors: { password: passwordError },
    };
  }

  // Check passwords match
  if (passwordStr !== confirmPasswordStr) {
    return {
      fieldErrors: { confirmPassword: "Passwords do not match" },
    };
  }

  try {
    const tokenHash = hashToken(tokenStr);

    // Find the token and associated user
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
          },
        },
      },
    });

    if (!resetToken) {
      return { error: "Invalid or expired reset link" };
    }

    // Check if already used
    if (resetToken.usedAt) {
      return { error: "This reset link has already been used" };
    }

    // Check if expired
    if (new Date() > resetToken.expiresAt) {
      return { error: "This reset link has expired. Please request a new one." };
    }

    // Check password is different from current
    const isSamePassword = await bcrypt.compare(
      passwordStr,
      resetToken.user.passwordHash
    );
    if (isSamePassword) {
      return {
        fieldErrors: {
          password: "New password must be different from your current password",
        },
      };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(passwordStr, BCRYPT_ROUNDS);

    // Update password, mark token as used, and increment password version
    // All in a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Update user password and increment password version
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: newPasswordHash,
          passwordVersion: { increment: 1 }, // Invalidates all existing JWT sessions
        },
      });

      // Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      // Delete all other tokens for this user (cleanup)
      await tx.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
        },
      });
    });

    console.log(
      `Password reset completed for user ${resetToken.userId} (${resetToken.user.email.substring(0, 3)}***)`
    );

    return { success: true };
  } catch (error) {
    console.error("Error resetting password:", error);
    return {
      error: "An error occurred. Please try again.",
    };
  }
}
