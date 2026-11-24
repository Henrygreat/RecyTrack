"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface AnimatedCounterProps {
  value: number;
  /**
   * Duration of the animation in milliseconds
   * @default 1000
   */
  duration?: number;
  /**
   * Format function for the displayed value
   * @default (n) => n.toLocaleString()
   */
  format?: (value: number) => string;
  /**
   * Additional className for styling
   */
  className?: string;
  /**
   * Prefix to display before the number (e.g., "$", "£")
   */
  prefix?: string;
  /**
   * Suffix to display after the number (e.g., "%", "kg")
   */
  suffix?: string;
  /**
   * Number of decimal places
   * @default 0
   */
  decimals?: number;
}

/**
 * Animated counter that smoothly transitions from 0 to the target value
 * Respects prefers-reduced-motion
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  format,
  className,
  prefix,
  suffix,
  decimals = 0,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Default formatter
  const defaultFormat = (n: number) => {
    if (decimals > 0) {
      return n.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return n.toLocaleString();
  };

  const formatValue = format || defaultFormat;

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      setHasAnimated(true);
      return;
    }

    // Intersection Observer to trigger animation when visible
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated) {
          startAnimation();
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, hasAnimated]);

  // Reset animation when value changes
  useEffect(() => {
    if (hasAnimated) {
      setHasAnimated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const startAnimation = () => {
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = easedProgress * value;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <span ref={elementRef} className={cn("tabular-nums", className)}>
      {prefix}
      {formatValue(displayValue)}
      {suffix}
    </span>
  );
}

/**
 * Simple percentage display with optional animation
 */
export function AnimatedPercentage({
  value,
  className,
  showSymbol = true,
}: {
  value: number;
  className?: string;
  showSymbol?: boolean;
}) {
  return (
    <AnimatedCounter
      value={value}
      decimals={1}
      suffix={showSymbol ? "%" : ""}
      className={className}
    />
  );
}
