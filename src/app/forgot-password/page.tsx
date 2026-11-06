"use client";

import Link from "next/link";
import { Recycle, ArrowLeft, Mail } from "lucide-react";

/**
 * Forgot Password Page (Placeholder)
 *
 * This is a placeholder page for the forgot password functionality.
 * Full implementation will be added in Increment B.
 */
export default function ForgotPasswordPage() {
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
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Reset your password
            </h1>
            <p className="text-slate-500 text-sm">
              Password reset functionality is coming soon. Please contact your
              administrator if you need to reset your password.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 text-center">
              For immediate assistance, please contact your organization
              administrator or email support.
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
