"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";
import {
  Recycle,
  Eye,
  EyeOff,
  Shield,
  Lock,
  FileCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";

const initialState: LoginState = {};

/**
 * Login Page
 *
 * Premium two-column layout for desktop, compact layout for mobile.
 * Features:
 * - RecyTrack branding
 * - Email and password inputs
 * - Password visibility toggle
 * - Forgot password link (placeholder)
 * - Sign in with loading state
 * - Link to customer registration
 */
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

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
            Secure IT Asset
            <br />
            <span className="text-teal-400">Disposal Portal</span>
          </h1>

          <p className="text-lg text-slate-300 mb-12 max-w-md leading-relaxed">
            Professional tracking for IT asset collection, data destruction, and compliant recycling operations.
          </p>

          {/* Feature List */}
          <div className="space-y-4">
            {[
              { icon: Shield, text: "Secure data destruction" },
              { icon: Lock, text: "Full chain of custody" },
              { icon: FileCheck, text: "Compliance certificates" },
            ].map((feature) => (
              <div key={feature.text} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-teal-400" />
                </div>
                <span className="text-slate-200">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 py-12 bg-white">
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

          {/* Welcome Text */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Welcome back
            </h2>
            <p className="text-slate-500">
              Sign in to access your operations portal
            </p>
          </div>

          {/* Login Form */}
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

            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={pending}
                placeholder="you@company.com"
                className="w-full px-4 py-3 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  disabled={pending}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">
                New to RecyTrack?
              </span>
            </div>
          </div>

          {/* Create Account Link */}
          <Link
            href="/register"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            Create a Customer Account
          </Link>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-slate-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
