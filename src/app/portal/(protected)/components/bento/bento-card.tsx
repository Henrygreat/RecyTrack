"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type CardVariant = "default" | "dark" | "gradient" | "outline";
type CardSize = "sm" | "md" | "lg" | "xl";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  /**
   * Visual variant of the card
   * @default "default"
   */
  variant?: CardVariant;
  /**
   * Padding size
   * @default "md"
   */
  size?: CardSize;
  /**
   * Enable hover effects
   * @default true
   */
  hoverable?: boolean;
  /**
   * Optional title displayed at top of card
   */
  title?: string;
  /**
   * Optional subtitle/description
   */
  subtitle?: string;
  /**
   * Optional action element (button, link) for top-right
   */
  action?: ReactNode;
  /**
   * Optional href to make the entire card clickable
   */
  href?: string;
  /**
   * Animation delay class for staggered animations
   */
  animationDelay?: string;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-white border border-slate-200",
  dark: "bg-midnight-navy border border-slate-700 text-white",
  gradient: "bg-gradient-to-br from-primary-teal to-accent-teal text-white border-0",
  outline: "bg-transparent border-2 border-slate-200",
};

const sizeStyles: Record<CardSize, string> = {
  sm: "p-3",
  md: "p-4 lg:p-5",
  lg: "p-5 lg:p-6",
  xl: "p-6 lg:p-8",
};

export function BentoCard({
  children,
  className,
  variant = "default",
  size = "md",
  hoverable = true,
  title,
  subtitle,
  action,
  href,
  animationDelay,
}: BentoCardProps) {
  const Wrapper = href ? "a" : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        // Base styles
        "relative rounded-xl overflow-hidden",
        "shadow-bento",
        "animate-fade-in",
        // Variant styles
        variantStyles[variant],
        // Size styles
        sizeStyles[size],
        // Hover effects
        hoverable && [
          "transition-all duration-200",
          "hover:shadow-bento-hover",
          variant === "default" && "hover:border-primary-teal/30",
          href && "cursor-pointer",
        ],
        // Animation delay
        animationDelay,
        className
      )}
      style={
        animationDelay
          ? { animationDelay: animationDelay.replace("delay-", "").replace("[", "").replace("]", "") }
          : undefined
      }
    >
      {/* Header with title and action */}
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h3
                className={cn(
                  "text-sm font-semibold truncate",
                  variant === "dark" || variant === "gradient"
                    ? "text-white"
                    : "text-slate-900"
                )}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className={cn(
                  "text-xs mt-0.5 truncate",
                  variant === "dark" || variant === "gradient"
                    ? "text-slate-300"
                    : "text-muted-text"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      {/* Card content */}
      {children}

      {/* Hover gradient overlay for default cards */}
      {hoverable && variant === "default" && href && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-teal/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
      )}
    </Wrapper>
  );
}

/**
 * Skeleton loader for BentoCard
 */
export function BentoCardSkeleton({
  className,
  size = "md",
}: {
  className?: string;
  size?: CardSize;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden",
        "bg-white border border-slate-200",
        "shadow-bento animate-pulse",
        sizeStyles[size],
        className
      )}
    >
      <div className="space-y-3">
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-16 bg-slate-200 rounded" />
        <div className="h-3 w-32 bg-slate-100 rounded" />
      </div>
    </div>
  );
}
