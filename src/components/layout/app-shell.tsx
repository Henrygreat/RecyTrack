"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
  organizationName: string;
  onSignOut: () => void;
}

export function AppShell({ children, organizationName, onSignOut }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div className={`lg:block ${mobileOpen ? "block" : "hidden"}`}>
        <Sidebar
          organizationName={organizationName}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onSignOut={onSignOut}
        />
      </div>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${
          collapsed ? "lg:ml-[70px]" : "lg:ml-[260px]"
        }`}
      >
        <Header
          showMenuButton
          onMenuClick={() => setMobileOpen(!mobileOpen)}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
