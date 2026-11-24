"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * 12-column responsive bento grid container
 * - Mobile: 1 column
 * - Tablet (md): 2 columns
 * - Desktop (lg): 12 columns with explicit spans
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-12",
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoGridItemProps {
  children: ReactNode;
  className?: string;
  /**
   * Column span for large screens (lg breakpoint)
   * @default 6
   */
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /**
   * Row span for large screens
   * @default 1
   */
  rowSpan?: 1 | 2 | 3;
  /**
   * Column span for medium screens (md breakpoint)
   * @default 1
   */
  mdColSpan?: 1 | 2;
}

const colSpanClasses: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

const rowSpanClasses: Record<number, string> = {
  1: "lg:row-span-1",
  2: "lg:row-span-2",
  3: "lg:row-span-3",
};

const mdColSpanClasses: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
};

/**
 * Grid item with configurable column/row spans
 */
export function BentoGridItem({
  children,
  className,
  colSpan = 6,
  rowSpan = 1,
  mdColSpan = 1,
}: BentoGridItemProps) {
  return (
    <div
      className={cn(
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        mdColSpanClasses[mdColSpan],
        className
      )}
    >
      {children}
    </div>
  );
}
