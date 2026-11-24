"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  Package,
  Award,
  FileText,
  Users,
  Bell,
  ClipboardList,
  Settings,
  HelpCircle,
  Recycle,
  X,
} from "lucide-react";

interface PortalMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerReference: string;
  isAdmin: boolean;
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
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
    ],
  },
  {
    title: "Asset Management",
    items: [
      { href: "/portal/assets", label: "My Assets", icon: Package },
    ],
  },
  {
    title: "Compliance",
    items: [
      { href: "/portal/certificates", label: "Certificates", icon: Award },
      { href: "/portal/reports", label: "Reports", icon: FileText },
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

export function PortalMobileNav({
  isOpen,
  onClose,
  customerName,
  customerReference,
  isAdmin,
}: PortalMobileNavProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 flex flex-col w-80 max-w-[85vw] bg-midnight-navy lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
          <Link href="/portal/dashboard" onClick={onClose} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-teal to-accent-teal flex items-center justify-center">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white">RecyTrack</div>
              <div className="text-xs text-slate-400">{customerReference}</div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Card */}
        <div className="mx-3 mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <p className="text-sm font-medium text-white truncate">{customerName}</p>
          <p className="text-xs text-slate-400">{isAdmin ? "Administrator" : "User"}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.adminOnly && !isAdmin) return false;
              return implementedRoutes.has(item.href);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-6">
                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </h3>
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
                        onClick={onClose}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-lg
                          transition-colors touch-manipulation
                          ${
                            isActive
                              ? "bg-teal-700 text-white"
                              : "text-slate-300 hover:text-white hover:bg-slate-800/50 active:bg-slate-800"
                          }
                        `}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
