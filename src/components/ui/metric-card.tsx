import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className = "" }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          {trend && (
            <p className={`text-sm font-medium ${trend.value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-teal-50 rounded-lg">
            <Icon className="w-6 h-6 text-teal-600" />
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardSkeletonProps {
  className?: string;
}

export function MetricCardSkeleton({ className = "" }: MetricCardSkeletonProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-8 w-16 bg-slate-200 rounded" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>
        <div className="p-3 bg-slate-100 rounded-lg">
          <div className="w-6 h-6 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}
