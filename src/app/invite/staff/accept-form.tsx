"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, User, Lock, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import {
  acceptStaffInvitation,
  acceptStaffInvitationExistingUser,
  type AcceptInvitationState,
} from "./actions";

interface AcceptStaffInvitationFormProps {
  token: string;
  email: string;
  name: string | null;
  existingUser: boolean;
}

export function AcceptStaffInvitationForm({
  token,
  email,
  name,
  existingUser,
}: AcceptStaffInvitationFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newUserState, newUserAction, newUserPending] = useActionState<
    AcceptInvitationState,
    FormData
  >(acceptStaffInvitation, {});

  const [existingUserState, existingUserAction, existingUserPending] = useActionState<
    AcceptInvitationState,
    FormData
  >(acceptStaffInvitationExistingUser, {});

  const isPending = newUserPending || existingUserPending;
  const state = existingUser ? existingUserState : newUserState;
  const formAction = existingUser ? existingUserAction : newUserAction;

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push("/login?message=Account created successfully. Please sign in.");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <div style={{ padding: "2rem 0", textAlign: "center" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#d1fae5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}
        >
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: "0.5rem",
          }}
        >
          Welcome to RecyTrack!
        </h3>
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          Your account is ready. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.5rem",
            color: "#b91c1c",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
        >
          {state.error}
        </div>
      )}

      {/* Email (readonly) */}
      <div style={{ marginBottom: "1rem" }}>
        <label
          htmlFor="email"
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#374151",
            marginBottom: "0.375rem",
          }}
        >
          Email
        </label>
        <div style={{ position: "relative" }}>
          <Mail
            className="w-5 h-5"
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          />
          <input
            type="email"
            id="email"
            value={email}
            disabled
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem 0.625rem 2.5rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              backgroundColor: "#f9fafb",
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          />
        </div>
      </div>

      {!existingUser && (
        <>
          {/* Name */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="name"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.375rem",
              }}
            >
              Full Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <User
                className="w-5 h-5"
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              />
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={name || ""}
                required
                placeholder="Enter your full name"
                style={{
                  width: "100%",
                  padding: "0.625rem 0.75rem 0.625rem 2.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
              />
            </div>
            {state.fieldErrors?.name && (
              <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#dc2626" }}>
                {state.fieldErrors.name}
              </p>
            )}
          </div>
        </>
      )}

      {/* Password */}
      <div style={{ marginBottom: "1rem" }}>
        <label
          htmlFor="password"
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#374151",
            marginBottom: "0.375rem",
          }}
        >
          {existingUser ? "Your Password" : "Create Password"}{" "}
          <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <div style={{ position: "relative" }}>
          <Lock
            className="w-5 h-5"
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          />
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            required
            minLength={existingUser ? 1 : 8}
            placeholder={existingUser ? "Enter your password" : "At least 8 characters"}
            style={{
              width: "100%",
              padding: "0.625rem 2.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem",
              color: "#9ca3af",
            }}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {state.fieldErrors?.password && (
          <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#dc2626" }}>
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      {!existingUser && (
        <>
          {/* Confirm Password */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="confirmPassword"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.375rem",
              }}
            >
              Confirm Password <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                className="w-5 h-5"
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                required
                placeholder="Confirm your password"
                style={{
                  width: "100%",
                  padding: "0.625rem 2.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.25rem",
                  color: "#9ca3af",
                }}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {state.fieldErrors?.confirmPassword && (
              <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#dc2626" }}>
                {state.fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        </>
      )}

      {existingUser && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "#64748b",
            marginBottom: "1.5rem",
          }}
        >
          An account exists for this email. Enter your password to join this organization.
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#0f766e",
          color: "white",
          border: "none",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {existingUser ? "Joining..." : "Creating Account..."}
          </>
        ) : existingUser ? (
          "Join Organization"
        ) : (
          "Create Account & Join"
        )}
      </button>
    </form>
  );
}
