"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Recycle, ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

/**
 * Forgot Password Page
 *
 * Allows users to request a password reset email.
 * Always shows a generic success message to prevent account enumeration.
 */
export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    {}
  );

  // Show success state
  if (state.success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              Recy<span className="text-teal-600">Track</span>
            </span>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-teal-600" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Check your email
              </h1>
              <p className="text-slate-500 text-sm">
                If an account exists for that email address, you will receive a
                password reset link shortly.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600 text-center">
                The link will expire in <strong>30 minutes</strong>. If you
                don&apos;t see the email, check your spam folder.
              </p>
            </div>

            {/* Back to Login */}
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <Recycle className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            Recy<span className="text-teal-600">Track</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-teal-600" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Reset your password
            </h1>
            <p className="text-slate-500 text-sm">
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </p>
          </div>

          {/* Error Message */}
          {state.error && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                state.rateLimited
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              <p className="text-sm font-medium">{state.error}</p>
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                autoFocus
                disabled={isPending}
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="you@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-4 text-xs text-slate-400 uppercase">or</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Back to Login */}
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
