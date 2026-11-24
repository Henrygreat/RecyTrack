"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
  X,
  Building2,
  ChevronRight,
  HelpCircle,
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
  notificationCount?: number;
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
  notificationCount = 0,
}: PortalHeaderProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Search will be handled by API - scoped to customer
      window.location.href = `/portal/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

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
          {/* Search - Desktop */}
          <form
            onSubmit={handleSearch}
            className={`hidden md:flex items-center transition-all duration-200 ${
              isSearchFocused ? "w-80" : "w-64"
            }`}
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search assets, collections..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal transition-all"
              />
            </div>
          </form>

          {/* Search - Mobile */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <Link
            href="/portal/notifications"
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ""}`}
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-2xs font-bold rounded-full bg-red-500 text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>

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

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/portal/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Settings
                  </Link>
                  <Link
                    href="/portal/help"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    Help & Support
                  </Link>
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
