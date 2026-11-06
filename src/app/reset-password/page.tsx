"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Recycle,
  ArrowLeft,
  Lock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  resetPassword,
  validateResetToken,
  type ResetPasswordState,
  type TokenValidationResult,
} from "./actions";

/**
 * Reset Password Page
 *
 * Allows users to set a new password using a valid reset token.
 * Validates token on load and shows appropriate error states.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

/**
 * Loading fallback for Suspense
 */
function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <Recycle className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            Recy<span className="text-teal-600">Track</span>
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main reset password content component
 */
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [tokenValidation, setTokenValidation] = useState<TokenValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, formAction, isPending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    {}
  );

  // Validate token on mount
  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setTokenValidation({
          valid: false,
          error: "No reset token provided",
        });
        setIsValidating(false);
        return;
      }

      const result = await validateResetToken(token);
      setTokenValidation(result);
      setIsValidating(false);
    }

    checkToken();
  }, [token]);

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              Recy<span className="text-teal-600">Track</span>
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
              <p className="text-slate-500 text-sm">Validating reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (tokenValidation && !tokenValidation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              Recy<span className="text-teal-600">Track</span>
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {tokenValidation.expired
                  ? "Link expired"
                  : tokenValidation.used
                    ? "Link already used"
                    : "Invalid link"}
              </h1>
              <p className="text-slate-500 text-sm">
                {tokenValidation.error}
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/forgot-password"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Request new reset link
              </Link>
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (state.success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              Recy<span className="text-teal-600">Track</span>
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-teal-600" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Password reset successful
              </h1>
              <p className="text-slate-500 text-sm">
                Your password has been updated. You can now sign in with your new password.
              </p>
            </div>

            <div className="bg-teal-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-teal-800 text-center">
                For security, all other sessions have been signed out.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Sign in with new password
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <Recycle className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            Recy<span className="text-teal-600">Track</span>
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-teal-600" />
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Create new password
            </h1>
            <p className="text-slate-500 text-sm">
              Enter a strong password that you don&apos;t use elsewhere.
            </p>
          </div>

          {/* Error Message */}
          {state.error && (
            <div className="p-4 rounded-lg mb-6 bg-red-50 border border-red-200 text-red-800">
              <p className="text-sm font-medium">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                  disabled={isPending}
                  className={`w-full px-4 py-3 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed ${
                    state.fieldErrors?.password
                      ? "border-red-300"
                      : "border-slate-300"
                  }`}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {state.fieldErrors?.password && (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.password}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                At least 8 characters with letters and numbers
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={isPending}
                  className={`w-full px-4 py-3 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed ${
                    state.fieldErrors?.confirmPassword
                      ? "border-red-300"
                      : "border-slate-300"
                  }`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {state.fieldErrors?.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset password"
              )}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-4 text-xs text-slate-400 uppercase">or</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
