"use client";

import { Menu, Search } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { UserProfileMenu } from "./user-profile-menu";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  userName: string | null;
  userEmail: string;
  organizationName: string;
  userRole: string;
  onSignOut: () => void;
}

export function Header({
  onMenuClick,
  showMenuButton = false,
  userName,
  userEmail,
  organizationName,
  userRole,
  onSignOut,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
        )}

        {/* Global Search */}
        <GlobalSearch />

        {/* Mobile search button */}
        <button
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors sm:hidden"
          aria-label="Search"
          onClick={() => {
            // Could open a mobile search modal in the future
          }}
        >
          <Search className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <UserProfileMenu
          userName={userName}
          userEmail={userEmail}
          organizationName={organizationName}
          userRole={userRole}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
