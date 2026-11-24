"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Building2,
  ChevronRight,
} from "lucide-react";

interface PortalHeaderProps {
  customerName: string;
  customerReference: string;
  isAdmin: boolean;
  userName?: string;
  userEmail?: string;
  onSignOut: () => Promise<void>;
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

// Breadcrumb mapping
const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  collections: "Collections",
  assets: "Assets",
  certificates: "Certificates",
  sites: "Sites",
  users: "Users",
  reports: "Reports",
  book: "Book a Collection",
  settings: "Settings",
  help: "Help & Support",
  notifications: "Notifications",
};

export function PortalHeader({
  customerName,
  customerReference,
  isAdmin,
  userName,
  userEmail,
  onSignOut,
  onMobileMenuToggle,
  isMobileMenuOpen,
}: PortalHeaderProps) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.slice(1).map((segment, index) => ({
    label: breadcrumbMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
    href: "/" + pathSegments.slice(0, index + 2).join("/"),
    isLast: index === pathSegments.length - 2,
  }));

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Breadcrumbs - Desktop only */}
          <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            <Link
              href="/portal/dashboard"
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              Portal
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                {crumb.isLast ? (
                  <span className="font-medium text-slate-900">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Right: Search, Notifications, Profile */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-slate-100 transition-colors"
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-teal to-accent-teal flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-slate-900 leading-tight">
                  {userName || customerName}
                </p>
                <p className="text-xs text-slate-500 leading-tight">
                  {isAdmin ? "Administrator" : "User"}
                </p>
              </div>
              <ChevronDown
                className={`hidden lg:block w-4 h-4 text-slate-400 transition-transform ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 animate-scale-in origin-top-right">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-teal to-accent-teal flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {userName || customerName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="truncate">{customerName}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400 font-mono">{customerReference}</div>
                </div>

                {/* Sign Out */}
                <div className="pt-1 border-t border-slate-100">
                  <form action={onSignOut}>
                    <button
                      type="submit"
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
