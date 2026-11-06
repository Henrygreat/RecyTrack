import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Authentication Configuration
 *
 * SECURITY:
 * - Uses bcrypt for password verification
 * - JWT-based sessions (stateless)
 * - Explicit cookie security settings
 * - Session timeout configured
 * - Secure cookie settings in production
 */

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Session duration in seconds.
 * Default: 24 hours (86400 seconds)
 * Can be overridden via AUTH_SESSION_MAX_AGE environment variable.
 */
const SESSION_MAX_AGE = parseInt(
  process.env.AUTH_SESSION_MAX_AGE || "86400",
  10
);

/**
 * Determine if we're in production.
 * Used for cookie security settings.
 */
const isProduction = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the host header in production (required for Coolify/reverse proxies)
  trustHost: true,

  // Session configuration
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    // How frequently to update the session in the database (for database sessions)
    // For JWT, this affects token refresh timing
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // JWT configuration
  jwt: {
    // Maximum age of the JWT token
    maxAge: SESSION_MAX_AGE,
  },

  // Custom pages
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // Cookie configuration for security
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        // Domain is automatically set by Next.js
      },
    },
    callbackUrl: {
      name: isProduction
        ? "__Secure-authjs.callback-url"
        : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      name: isProduction
        ? "__Host-authjs.csrf-token"
        : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Validate input
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        // Find user by email (case-insensitive)
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          return null;
        }

        // Verify password
        const isValidPassword = await compare(password, user.passwordHash);
        if (!isValidPassword) {
          return null;
        }

        // Update last login timestamp
        // Note: We do this asynchronously to not slow down login
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch((err) => {
            console.error("Failed to update lastLoginAt:", err);
          });

        // Return user object for session
        // Include passwordVersion for session invalidation on password reset
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordVersion: user.passwordVersion,
        };
      },
    }),
  ],

  callbacks: {
    // Include user ID and passwordVersion in the JWT token
    async jwt({ token, user, trigger }) {
      // On initial sign-in, store user data including passwordVersion
      if (user?.id) {
        token.id = user.id;
        token.passwordVersion = (user as { passwordVersion?: number }).passwordVersion ?? 1;
      }

      // On subsequent requests, validate passwordVersion hasn't changed
      // This invalidates sessions after password reset
      if (trigger === "update" || (token.id && !user)) {
        // Only check periodically to avoid database load (every 5 minutes)
        const lastChecked = token.passwordVersionCheckedAt as number | undefined;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

        if (!lastChecked || lastChecked < fiveMinutesAgo) {
          try {
            const currentUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { passwordVersion: true },
            });

            if (currentUser) {
              // If passwordVersion has changed, invalidate session by returning empty token
              if (currentUser.passwordVersion !== token.passwordVersion) {
                console.log(`Session invalidated for user ${token.id}: password version changed`);
                return {} as typeof token;
              }
              token.passwordVersionCheckedAt = Date.now();
            }
          } catch (error) {
            // On database error, allow request to continue but log
            console.error("Error validating password version:", error);
          }
        }
      }

      return token;
    },
    // Include user ID in the session
    session({ session, token }) {
      // If token was invalidated (empty), return null session
      if (!token.id) {
        return { ...session, user: undefined };
      }
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  // Security events (optional logging)
  events: {
    signIn: async ({ user }) => {
      // Log successful sign-in (could be extended for security audit)
      if (process.env.NODE_ENV === "development") {
        console.log(`User signed in: ${user.email}`);
      }
    },
    signOut: async () => {
      // Log sign-out (could be extended for security audit)
      if (process.env.NODE_ENV === "development") {
        console.log("User signed out");
      }
    },
  },
});
