"use client";

import Link from "next/link";
import { ArrowRight, Package, Truck } from "lucide-react";

interface WelcomeBannerProps {
  customerName: string;
  userName?: string;
}

export function WelcomeBanner({ customerName, userName }: WelcomeBannerProps) {
  const displayName = userName?.split(" ")[0] || "there";

  return (
    <div className="portal-welcome relative overflow-hidden rounded-2xl p-6 lg:p-8 shadow-lg">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full animate-float" />
        <div
          className="absolute top-1/2 -right-5 w-24 h-24 bg-white/5 rounded-full animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute -bottom-8 right-1/4 w-32 h-32 bg-white/5 rounded-full animate-float"
          style={{ animationDelay: "2s" }}
        />

        {/* Recycling symbol pattern - subtle background */}
        <svg
          className="absolute right-0 top-0 h-full w-1/2 text-white/5"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <path d="M100 20 L140 80 L100 60 L60 80 Z" />
          <path d="M140 80 L180 140 L140 120 L100 140 Z" />
          <path d="M60 80 L100 140 L60 120 L20 140 Z" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Text Content */}
        <div className="max-w-xl">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            Welcome, {displayName}
          </h1>
          <p className="text-teal-100 text-base lg:text-lg mb-1">{customerName}</p>
          <p className="text-white/80 text-sm lg:text-base">
            Track your IT asset recycling, manage collections, and access compliance certificates
            all in one place.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 lg:flex-col xl:flex-row">
          <Link
            href="/portal/book"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-teal-800 font-semibold rounded-lg shadow-md hover:shadow-lg hover:bg-teal-50 transition-all group"
          >
            <Truck className="w-5 h-5" />
            <span>Book a Collection</span>
            <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </Link>
          <Link
            href="/portal/assets"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/15 text-white font-semibold rounded-lg border border-white/20 hover:bg-white/25 transition-all"
          >
            <Package className="w-5 h-5" />
            <span>View My Assets</span>
          </Link>
        </div>
      </div>

      {/* Decorative Recycling Illustration */}
      <div aria-hidden="true" className="pointer-events-none hidden lg:block absolute right-8 bottom-0 w-48 h-48">
        <RecyclingIllustration />
      </div>
    </div>
  );
}

function RecyclingIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="w-full h-full text-white/20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Animated recycling symbol */}
      <g className="origin-center" style={{ animation: "spin 20s linear infinite" }}>
        {/* Arrow 1 */}
        <path
          d="M60 15 L75 35 L67 35 L67 50 L53 50 L53 35 L45 35 Z"
          fill="currentColor"
          className="opacity-80"
        />
        {/* Arrow 2 */}
        <path
          d="M95 70 L85 90 L85 82 L70 90 L63 78 L78 70 L78 62 Z"
          fill="currentColor"
          className="opacity-60"
          style={{ transform: "rotate(120deg)", transformOrigin: "60px 60px" }}
        />
        {/* Arrow 3 */}
        <path
          d="M25 70 L35 90 L35 82 L50 90 L57 78 L42 70 L42 62 Z"
          fill="currentColor"
          className="opacity-40"
          style={{ transform: "rotate(240deg)", transformOrigin: "60px 60px" }}
        />
      </g>

      {/* Central circle */}
      <circle cx="60" cy="60" r="12" fill="currentColor" className="opacity-30" />

      {/* Outer ring */}
      <circle
        cx="60"
        cy="60"
        r="50"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="opacity-20"
        strokeDasharray="10 5"
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}
