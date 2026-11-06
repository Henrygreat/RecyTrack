"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { register, type RegisterState } from "./actions";
import {
  Recycle,
  Eye,
  EyeOff,
  Building2,
  User,
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
} from "lucide-react";

const initialState: RegisterState = {};

/**
 * Customer Registration Page
 *
 * Self-registration for new customers with:
 * - Company name
 * - Contact name
 * - Email
 * - Password with confirmation
 * - Terms acceptance
 * - Email verification flow
 */
export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // If registration was successful, show the verification message
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
                <Mail className="w-8 h-8 text-teal-600" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Check your email
              </h1>
              <p className="text-slate-500">
                We&apos;ve sent a verification link to:
              </p>
              <p className="text-slate-900 font-medium mt-2">{state.email}</p>
            </div>

            {/* Instructions */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-3">
              <p className="text-sm text-slate-600">
                Please click the link in the email to verify your account. The link will expire in 24 hours.
              </p>
              <p className="text-sm text-slate-600">
                After verification, your registration will be reviewed by our team. You&apos;ll receive an email once approved.
              </p>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                Didn&apos;t receive the email? Check your spam folder or contact support.
              </p>
            </div>

            {/* Back to Login */}
            <Link
              href="/login"
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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
    <div className="min-h-screen flex">
      {/* Left Column - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-600 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
              <Recycle className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">
              Recy<span className="text-teal-400">Track</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Create your
            <br />
            <span className="text-teal-400">Customer Account</span>
          </h1>

          <p className="text-lg text-slate-300 mb-12 max-w-md leading-relaxed">
            Join RecyTrack to manage your IT asset recycling with full transparency and compliance.
          </p>

          {/* Benefits List */}
          <div className="space-y-4">
            {[
              "Book and track collections online",
              "Real-time asset status updates",
              "Download destruction certificates",
              "Access historical compliance data",
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <span className="text-slate-200">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              Recy<span className="text-teal-600">Track</span>
            </span>
          </div>

          {/* Back Link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Create your account
            </h2>
            <p className="text-slate-500">
              Register as a new customer to get started
            </p>
          </div>

          {/* Registration Form */}
          <form action={formAction} className="space-y-5">
            {/* Error Alert */}
            {state.error && (
              <div
                className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">{state.error}</div>
              </div>
            )}

            {/* Field Errors */}
            {state.fieldErrors && (
              <div className="space-y-2">
                {Object.entries(state.fieldErrors).map(([field, errors]) => (
                  <div
                    key={field}
                    className="text-sm text-rose-600"
                  >
                    {errors?.map((error, i) => (
                      <p key={i}>{error}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Company Name */}
            <div className="space-y-2">
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-slate-700"
              >
                Company Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  disabled={pending}
                  placeholder="Your company name"
                  defaultValue={state.values?.companyName}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <label
                htmlFor="contactName"
                className="block text-sm font-medium text-slate-700"
              >
                Your Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="contactName"
                  name="contactName"
                  type="text"
                  required
                  disabled={pending}
                  placeholder="Your full name"
                  defaultValue={state.values?.contactName}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Work Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  disabled={pending}
                  placeholder="you@company.com"
                  defaultValue={state.values?.email}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  disabled={pending}
                  placeholder="Create a strong password"
                  className="w-full pl-10 pr-12 py-3 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                At least 8 characters with uppercase, lowercase, and a number
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  disabled={pending}
                  placeholder="Confirm your password"
                  className="w-full pl-10 pr-12 py-3 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                disabled={pending}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="terms" className="text-sm text-slate-600">
                I agree to the{" "}
                <a href="#" className="text-teal-600 hover:text-teal-700 font-medium">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-teal-600 hover:text-teal-700 font-medium">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
            <Shield className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              Your data is encrypted and secure. We never share your information with third parties.
            </p>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
