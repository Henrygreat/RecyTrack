"use client";

import { useActionState } from "react";
import { acceptInvitationNewUser, acceptInvitationExistingUser, type AcceptInvitationState } from "./actions";
import { Eye, EyeOff, Loader2, Mail, User, Lock, Shield } from "lucide-react";
import { useState } from "react";

interface Props {
  token: string;
  email: string;
  role: "CUSTOMER_ADMIN" | "CUSTOMER_USER";
  customerName: string;
  existingUser?: { id: string; name: string | null; email: string } | null;
}

export function AcceptInvitationForm({ token, email, role, customerName, existingUser }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, action, pending] = useActionState<AcceptInvitationState, FormData>(
    existingUser ? acceptInvitationExistingUser : acceptInvitationNewUser,
    {}
  );

  const roleLabel = role === "CUSTOMER_ADMIN" ? "Administrator" : "User";

  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />

      {/* Invitation Details */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#f0fdfa",
          borderRadius: "0.5rem",
          marginBottom: "1.5rem",
          border: "1px solid #ccfbf1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Mail className="w-4 h-4 text-teal-600" />
          <span style={{ fontSize: "0.875rem", color: "#0f766e", fontWeight: 500 }}>{email}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Shield className="w-4 h-4 text-teal-600" />
          <span style={{ fontSize: "0.875rem", color: "#0f766e" }}>
            <strong>{roleLabel}</strong> access to {customerName}
          </span>
        </div>
      </div>

      {existingUser ? (
        // Existing user - just need password
        <>
          <p style={{ color: "#475569", marginBottom: "1rem", fontSize: "0.875rem" }}>
            We found an existing account for this email. Please enter your password to confirm your identity and accept
            this invitation.
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#334155",
                marginBottom: "0.375rem",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                className="w-4 h-4"
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                required
                style={{
                  width: "100%",
                  padding: "0.625rem 2.5rem 0.625rem 2.25rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
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
                  padding: 0,
                  color: "#94a3b8",
                }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      ) : (
        // New user - need name and password
        <>
          <p style={{ color: "#475569", marginBottom: "1rem", fontSize: "0.875rem" }}>
            Create your account to access the customer portal.
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="name"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#334155",
                marginBottom: "0.375rem",
              }}
            >
              Full Name
            </label>
            <div style={{ position: "relative" }}>
              <User
                className="w-4 h-4"
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                id="name"
                name="name"
                required
                minLength={2}
                style={{
                  width: "100%",
                  padding: "0.625rem 0.75rem 0.625rem 2.25rem",
                  border: state.fieldErrors?.name ? "1px solid #ef4444" : "1px solid #e2e8f0",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {state.fieldErrors?.name && (
              <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>{state.fieldErrors.name}</p>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#334155",
                marginBottom: "0.375rem",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                className="w-4 h-4"
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                required
                minLength={8}
                style={{
                  width: "100%",
                  padding: "0.625rem 2.5rem 0.625rem 2.25rem",
                  border: state.fieldErrors?.password ? "1px solid #ef4444" : "1px solid #e2e8f0",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
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
                  padding: 0,
                  color: "#94a3b8",
                }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {state.fieldErrors?.password ? (
              <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {state.fieldErrors.password}
              </p>
            ) : (
              <p style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                Must be at least 8 characters
              </p>
            )}
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="confirmPassword"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#334155",
                marginBottom: "0.375rem",
              }}
            >
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                className="w-4 h-4"
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                required
                style={{
                  width: "100%",
                  padding: "0.625rem 2.5rem 0.625rem 2.25rem",
                  border: state.fieldErrors?.confirmPassword ? "1px solid #ef4444" : "1px solid #e2e8f0",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
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
                  padding: 0,
                  color: "#94a3b8",
                }}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {state.fieldErrors?.confirmPassword && (
              <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {state.fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        </>
      )}

      {/* Error Message */}
      {state.error && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.375rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: 0 }}>{state.error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={pending}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          backgroundColor: pending ? "#94a3b8" : "#0f766e",
          color: "white",
          border: "none",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: pending ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {existingUser ? "Signing in..." : "Creating account..."}
          </>
        ) : existingUser ? (
          "Sign In & Accept Invitation"
        ) : (
          "Create Account & Accept Invitation"
        )}
      </button>
    </form>
  );
}
