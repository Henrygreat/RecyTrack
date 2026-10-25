"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Calendar,
  Warehouse,
  Shield,
  FileText,
  BarChart3,
  Settings,
  UserCog,
  ChevronLeft,
  LogOut,
  Box,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Customers", href: "/dashboard/customers", icon: Users },
      { label: "Collections", href: "/dashboard/collections", icon: Package },
      { label: "Route Calendar", href: "/dashboard/routes", icon: Calendar },
    ],
  },
  {
    label: "Asset Management",
    items: [
      { label: "Asset Inventory", href: "/dashboard/assets", icon: Box, badge: "Soon" },
      { label: "Warehouse", href: "/dashboard/warehouse", icon: Warehouse, badge: "Soon" },
      { label: "Data Destruction", href: "/dashboard/destruction", icon: Shield, badge: "Soon" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Documents", href: "/dashboard/documents", icon: FileText, badge: "Soon" },
      { label: "Reports", href: "/dashboard/reports", icon: BarChart3, badge: "Soon" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings, badge: "Soon" },
      { label: "Users", href: "/dashboard/users", icon: UserCog, badge: "Soon" },
    ],
  },
];

interface SidebarProps {
  organizationName: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onSignOut: () => void;
}

export function Sidebar({ organizationName, collapsed = false, onToggle, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? "w-[70px]" : "w-[260px]"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 font-bold text-white">
              R
            </div>
            {!collapsed && (
              <span className="text-lg font-bold">
                Recy<span className="text-teal-400">Track</span>
              </span>
            )}
          </Link>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {/* Organization name */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Organization</p>
            <p className="text-sm font-medium text-slate-300 truncate">{organizationName}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navigation.map((group) => (
            <div key={group.label} className="mb-6">
              {!collapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.badge ? "#" : item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-teal-500/10 text-teal-400"
                            : item.badge
                            ? "text-slate-500 cursor-not-allowed"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                        onClick={item.badge ? (e) => e.preventDefault() : undefined}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-700 text-slate-400 rounded">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
