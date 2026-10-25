"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    await signIn("credentials", {
      email: String(email),
      password: String(password),
      redirectTo: "/dashboard",
    });
    // signIn redirects on success, so this line is never reached
    return {};
  } catch (error) {
    // Auth.js uses Next.js redirect internally - preserve it
    if (isRedirectError(error)) {
      throw error;
    }

    // Handle Auth.js authentication errors
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        case "CallbackRouteError":
          return { error: "Authentication failed. Please try again." };
        default:
          return { error: "An authentication error occurred" };
      }
    }

    // Unknown errors
    console.error("Login error:", error);
    return { error: "An unexpected error occurred" };
  }
}
