"use server";

import { z } from "zod";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

/**
 * Registration State
 *
 * Used to track registration form state including:
 * - Success/error status
 * - Field validation errors
 * - Preserved form values
 */
export type RegisterState = {
  success?: boolean;
  email?: string;
  error?: string;
  fieldErrors?: {
    companyName?: string[];
    contactName?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
    terms?: string[];
  };
  values?: {
    companyName?: string;
    contactName?: string;
    email?: string;
  };
};

/**
 * Password validation requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * Registration form validation schema
 */
const registerSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Company name must be at least 2 characters")
      .max(200, "Company name must be less than 200 characters"),
    contactName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),
    email: z
      .string()
      .email("Please enter a valid email address")
      .max(255, "Email must be less than 255 characters"),
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z
      .string()
      .refine((val) => val === "on", {
        message: "You must accept the terms and conditions",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Verification token expiration time (24 hours)
 */
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate a secure verification token
 */
function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Register a new customer
 *
 * Process:
 * 1. Validate form input
 * 2. Check for existing registrations/users
 * 3. Hash password
 * 4. Create registration record
 * 5. Send verification email
 *
 * SECURITY:
 * - Password hashed with bcrypt (12 rounds)
 * - Cryptographically secure verification token
 * - Rate limiting should be applied at middleware level
 * - Email normalized to lowercase
 */
export async function register(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // Extract form values
  const rawValues = {
    companyName: formData.get("companyName") as string,
    contactName: formData.get("contactName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    terms: formData.get("terms") as string,
  };

  // Preserve values for form repopulation (excluding passwords)
  const preservedValues = {
    companyName: rawValues.companyName,
    contactName: rawValues.contactName,
    email: rawValues.email,
  };

  // Validate input
  const validationResult = registerSchema.safeParse(rawValues);

  if (!validationResult.success) {
    const fieldErrors: RegisterState["fieldErrors"] = {};

    for (const issue of validationResult.error.issues) {
      const field = issue.path[0] as keyof typeof fieldErrors;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field]!.push(issue.message);
    }

    return {
      fieldErrors,
      values: preservedValues,
    };
  }

  const { companyName, contactName, email, password } = validationResult.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if email is already registered (as a user)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        error: "An account with this email already exists. Please sign in instead.",
        values: preservedValues,
      };
    }

    // Check for pending registration with same email
    const existingRegistration = await prisma.customerRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingRegistration) {
      // If pending verification, allow re-registration (resend verification)
      if (existingRegistration.status === "PENDING_VERIFICATION") {
        // Delete old registration and create new one
        await prisma.customerRegistration.delete({
          where: { id: existingRegistration.id },
        });
      } else if (existingRegistration.status === "PENDING_APPROVAL") {
        return {
          error: "A registration with this email is pending approval. Please wait for admin review.",
          values: preservedValues,
        };
      } else if (existingRegistration.status === "APPROVED") {
        return {
          error: "This email has already been registered. Please sign in.",
          values: preservedValues,
        };
      } else if (existingRegistration.status === "REJECTED") {
        return {
          error: "This registration was rejected. Please contact support for assistance.",
          values: preservedValues,
        };
      }
    }

    // Hash password (bcrypt with 12 rounds)
    const passwordHash = await hash(password, 12);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // Create registration record
    const registration = await prisma.customerRegistration.create({
      data: {
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: normalizedEmail,
        passwordHash,
        verificationToken,
        verificationExpires,
        status: "PENDING_VERIFICATION",
      },
    });

    // Send verification email
    try {
      const emailResult = await sendVerificationEmail({
        to: normalizedEmail,
        name: contactName,
        verificationToken,
      });

      // Update registration with email tracking info
      if (emailResult.messageId) {
        await prisma.customerRegistration.update({
          where: { id: registration.id },
          data: {
            emailSentAt: new Date(),
            emailMessageId: emailResult.messageId,
          },
        });
      }
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Still return success - user can request resend
      // Update registration with failure info
      await prisma.customerRegistration.update({
        where: { id: registration.id },
        data: {
          emailFailedAt: new Date(),
          emailFailureReason:
            emailError instanceof Error ? emailError.message : "Unknown error",
        },
      });
    }

    return {
      success: true,
      email: normalizedEmail,
    };
  } catch (error) {
    console.error("Registration error:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return {
          error: "An account with this email already exists.",
          values: preservedValues,
        };
      }
    }

    return {
      error: "An unexpected error occurred. Please try again later.",
      values: preservedValues,
    };
  }
}
