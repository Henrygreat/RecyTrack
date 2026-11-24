"use client";

import Link from "next/link";
import {
  ClipboardList,
  Calendar,
  Package,
  Award,
  FileText,
  MapPin,
  Truck,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  implemented?: boolean;
}

const quickActions: QuickAction[] = [
  {
    href: "/portal/book",
    label: "Book a Collection",
    description: "Schedule a pickup",
    icon: ClipboardList,
    iconColor: "text-primary-teal",
    iconBgColor: "bg-primary-teal/10",
    implemented: true,
  },
  {
    href: "/portal/collections",
    label: "My Collections",
    description: "Track pickups",
    icon: Truck,
    iconColor: "text-purple-600",
    iconBgColor: "bg-purple-100",
    implemented: true,
  },
  {
    href: "/portal/assets",
    label: "Track Equipment",
    description: "View all assets",
    icon: Package,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-100",
    implemented: true,
  },
  {
    href: "/portal/certificates",
    label: "Download Certificates",
    description: "Compliance docs",
    icon: Award,
    iconColor: "text-eco-green",
    iconBgColor: "bg-emerald-100",
    implemented: true,
  },
  {
    href: "/portal/reports",
    label: "View Reports",
    description: "Export data",
    icon: FileText,
    iconColor: "text-amber-600",
    iconBgColor: "bg-amber-100",
    implemented: true,
  },
  {
    href: "/portal/sites",
    label: "Manage Sites",
    description: "Collection locations",
    icon: MapPin,
    iconColor: "text-rose-600",
    iconBgColor: "bg-rose-100",
    implemented: true,
  },
];

export function QuickActions() {
  const implementedActions = quickActions.filter((action) => action.implemented);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-midnight-navy">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {implementedActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-bento hover:shadow-bento-hover hover:border-primary-teal/30 transition-all duration-200"
          >
            <div
              className={`p-3 rounded-xl ${action.iconBgColor} group-hover:scale-110 transition-transform`}
            >
              <action.icon className={`w-5 h-5 ${action.iconColor}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-midnight-navy group-hover:text-primary-teal transition-colors">
                {action.label}
              </p>
              <p className="text-xs text-muted-text mt-0.5">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
