"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  LogOut,
  Building,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

interface PortalShellProps {
  children: React.ReactNode;
  customerName: string;
  customerReference: string;
  isAdmin: boolean;
  onSignOut: () => Promise<void>;
}

const navItems = [
  { href: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/collections", label: "Collections", icon: Truck },
  { href: "/portal/sites", label: "Sites", icon: MapPin },
];

export function PortalShell({
  children,
  customerName,
  customerReference,
  isAdmin,
  onSignOut,
}: PortalShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "#0f766e",
          color: "white",
          padding: "0 1.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: "none",
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link
            href="/portal/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div style={{ fontWeight: "600", fontSize: "1rem" }}>Customer Portal</div>
              <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>{customerReference}</div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: "flex",
            gap: "0.25rem",
          }}
          className="desktop-nav"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "transparent",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? "500" : "400",
                }}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ textAlign: "right" }} className="customer-info">
            <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>{customerName}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
              {isAdmin ? "Administrator" : "User"}
            </div>
          </div>
          <form action={onSignOut}>
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "0.375rem",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="sign-out-text">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav
          style={{
            backgroundColor: "#0f766e",
            padding: "0.5rem 1rem 1rem",
          }}
          className="mobile-nav"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.375rem",
                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "transparent",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                }}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Main Content */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1.5rem",
        }}
      >
        {children}
      </main>

      {/* Mobile styles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .customer-info {
            display: none !important;
          }
          .sign-out-text {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
