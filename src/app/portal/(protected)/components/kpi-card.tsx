"use client";

import { type LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  href?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary-teal",
  iconBgColor = "bg-primary-teal/10",
  href,
}: KPICardProps) {
  const Wrapper = href ? "a" : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`
        group relative bg-white rounded-xl border border-slate-200 p-5
        shadow-bento transition-all duration-200
        ${href ? "hover:shadow-bento-hover hover:border-primary-teal/30 cursor-pointer" : ""}
      `}
    >
      {/* Gradient overlay on hover */}
      {href && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-teal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-text truncate">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-midnight-navy mt-1 animate-count-up">
            {value.toLocaleString()}
          </p>
          {subtitle && <p className="text-xs text-muted-text mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`flex-shrink-0 p-3 rounded-xl ${iconBgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </Wrapper>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-bento animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-8 w-16 bg-slate-200 rounded mt-2" />
          <div className="h-3 w-24 bg-slate-100 rounded mt-2" />
        </div>
        <div className="p-3 bg-slate-100 rounded-xl">
          <div className="w-5 h-5 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}
