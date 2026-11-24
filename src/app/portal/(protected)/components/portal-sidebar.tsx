"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  Package,
  Award,
  FileText,
  Users,
  Bell,
  Calendar,
  ClipboardList,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Recycle,
  FileCheck,
  Wallet,
  Receipt,
  CreditCard,
  PiggyBank,
} from "lucide-react";

interface PortalSidebarProps {
  customerName: string;
  customerReference: string;
  isAdmin: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  badge?: number;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/portal/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Logistics",
    items: [
      { href: "/portal/book", label: "Book a Collection", icon: ClipboardList },
      { href: "/portal/collections", label: "My Collections", icon: Truck },
      { href: "/portal/calendar", label: "Route Calendar", icon: Calendar },
    ],
  },
  {
    title: "Asset Management",
    items: [
      { href: "/portal/assets", label: "My Assets", icon: Package },
      { href: "/portal/tracking", label: "Asset Tracking", icon: Recycle },
    ],
  },
  {
    title: "Compliance",
    items: [
      { href: "/portal/certificates", label: "Certificates", icon: Award },
      { href: "/portal/documents", label: "Documents", icon: FileCheck },
      { href: "/portal/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "Commercial",
    items: [
      { href: "/portal/quotes", label: "Quotes", icon: Receipt },
      { href: "/portal/invoices", label: "Invoices", icon: CreditCard },
      { href: "/portal/funds", label: "Customer Funds", icon: Wallet },
      { href: "/portal/rebates", label: "Rebates", icon: PiggyBank },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/portal/sites", label: "Manage Sites", icon: MapPin },
      { href: "/portal/users", label: "Manage Users", icon: Users, adminOnly: true },
      { href: "/portal/settings", label: "Settings", icon: Settings },
      { href: "/portal/help", label: "Help & Support", icon: HelpCircle },
    ],
  },
];

// Routes that are fully implemented
const implementedRoutes = new Set([
  "/portal/dashboard",
  "/portal/collections",
  "/portal/assets",
  "/portal/certificates",
  "/portal/sites",
  "/portal/users",
  "/portal/reports",
  "/portal/book",
]);

export function PortalSidebar({
  customerName,
  customerReference,
  isAdmin,
  isCollapsed,
  onToggleCollapse,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 h-screen bg-midnight-navy
        transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-[72px]" : "w-64"}
        flex flex-col
      `}
    >
      {/* Logo and Brand */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
        <Link
          href="/portal/dashboard"
          className="flex items-center gap-3 text-white group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-teal to-accent-teal flex items-center justify-center shadow-lg group-hover:shadow-primary-teal/25 transition-shadow">
            <Recycle className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="font-bold text-base tracking-tight">RecyTrack</div>
              <div className="text-xs text-slate-400 truncate max-w-[140px]">
                {customerReference}
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Customer Info Card */}
      {!isCollapsed && (
        <div className="mx-3 mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-teal/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-primary-teal" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{customerName}</p>
              <p className="text-xs text-slate-400">
                {isAdmin ? "Administrator" : "User"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            // Filter admin-only items
            if (item.adminOnly && !isAdmin) return false;
            // Only show implemented routes
            return implementedRoutes.has(item.href);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {!isCollapsed && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/portal/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`
                        relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-all duration-150 group
                        ${
                          isActive
                            ? "bg-primary-teal text-white shadow-lg shadow-primary-teal/20"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        }
                        ${isCollapsed ? "justify-center" : ""}
                      `}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {isCollapsed && item.badge && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-2xs font-medium rounded-full bg-red-500 text-white">
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-slate-700/50">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
