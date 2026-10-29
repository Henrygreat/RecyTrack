import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "secondary";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  secondary: "bg-teal-50 text-teal-700 border-teal-200",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

// Collection status badge helper
export function CollectionStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    DRAFT: { variant: "default", label: "Draft" },
    REQUESTED: { variant: "warning", label: "Requested" },
    APPROVED: { variant: "info", label: "Approved" },
    SCHEDULED: { variant: "info", label: "Scheduled" },
    ASSIGNED: { variant: "info", label: "Assigned" },
    IN_TRANSIT: { variant: "secondary", label: "In Transit" },
    COLLECTED: { variant: "success", label: "Collected" },
    RECEIVED: { variant: "success", label: "Received" },
    COMPLETED: { variant: "success", label: "Completed" },
    CANCELLED: { variant: "error", label: "Cancelled" },
    EXCEPTION: { variant: "error", label: "Exception" },
  };

  const config = statusConfig[status] || { variant: "default" as BadgeVariant, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Priority badge helper
export function PriorityBadge({ priority }: { priority: string }) {
  const priorityConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    LOW: { variant: "default", label: "Low" },
    NORMAL: { variant: "info", label: "Normal" },
    HIGH: { variant: "warning", label: "High" },
    URGENT: { variant: "error", label: "Urgent" },
  };

  const config = priorityConfig[priority] || { variant: "default" as BadgeVariant, label: priority };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
