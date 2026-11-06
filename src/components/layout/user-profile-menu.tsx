"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  User,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Shield,
} from "lucide-react";

interface UserProfileMenuProps {
  userName: string | null;
  userEmail: string;
  organizationName: string;
  userRole: string;
  onSignOut: () => void;
}

const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  OPERATIONS: "Operations Manager",
  WAREHOUSE: "Warehouse Staff",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

export function UserProfileMenu({
  userName,
  userEmail,
  organizationName,
  userRole,
  onSignOut,
}: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const getInitials = (name: string | null, email: string): string => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
          <span className="text-xs font-semibold text-teal-700">
            {getInitials(userName, userEmail)}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform hidden sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Profile Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-teal-700">
                  {getInitials(userName, userEmail)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {userName || "User"}
                </p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 px-2 py-1.5 bg-slate-50 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-600">{roleLabels[userRole] || userRole}</span>
            </div>
          </div>

          {/* Organization */}
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Organization</span>
            </div>
            <p className="text-sm font-medium text-slate-900 truncate">{organizationName}</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              My Profile
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Account Settings
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-slate-200 py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
