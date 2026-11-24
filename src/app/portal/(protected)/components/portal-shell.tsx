"use client";

import { useState, useEffect } from "react";
import { PortalSidebar } from "./portal-sidebar";
import { PortalHeader } from "./portal-header";
import { PortalMobileNav } from "./portal-mobile-nav";

interface PortalShellProps {
  children: React.ReactNode;
  customerName: string;
  customerReference: string;
  isAdmin: boolean;
  userName?: string;
  userEmail?: string;
  onSignOut: () => Promise<void>;
}

const SIDEBAR_COLLAPSED_KEY = "portal-sidebar-collapsed";

export function PortalShell({
  children,
  customerName,
  customerReference,
  isAdmin,
  userName,
  userEmail,
  onSignOut,
}: PortalShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === "true");
    }
  }, []);

  // Save sidebar state to localStorage
  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  if (!mounted) {
    // Prevent hydration mismatch by showing loading state
    return (
      <div className="min-h-screen bg-light-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="customer-portal min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <PortalSidebar
          customerName={customerName}
          customerReference={customerReference}
          isAdmin={isAdmin}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      <PortalMobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        customerName={customerName}
        customerReference={customerReference}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"}
        `}
      >
        {/* Top Header */}
        <PortalHeader
          customerName={customerName}
          customerReference={customerReference}
          isAdmin={isAdmin}
          userName={userName}
          userEmail={userEmail}
          onSignOut={onSignOut}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          isMobileMenuOpen={mobileMenuOpen}
        />

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
