"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getIcon, type IconName } from "@/lib/icons";

interface EmptyStateProps {
  /**
   * Icon name for Server Component → Client Component usage.
   * Preferred method - pass a string that gets resolved client-side.
   */
  iconName?: IconName;
  /**
   * Direct icon component for Client Component → Client Component usage.
   * @deprecated Use iconName when passing from Server Components.
   */
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  children?: ReactNode;
}

export function EmptyState({
  iconName,
  icon: DirectIcon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  // Prefer iconName (safe for server/client boundary), fallback to direct icon
  const Icon = iconName ? getIcon(iconName) : DirectIcon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="p-4 bg-slate-100 rounded-full mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
        >
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
