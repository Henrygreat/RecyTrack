"use client";

import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

type LandingMotionControlProps = {
  className?: string;
};

type LandingSceneProps = {
  className: string;
  children: ReactNode;
};

export function LandingScene({ className, children }: LandingSceneProps) {
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType === "touch" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;

    event.currentTarget.style.setProperty(
      "--scene-tilt-x",
      `${-vertical * 2}deg`,
    );
    event.currentTarget.style.setProperty(
      "--scene-tilt-y",
      `${horizontal * 2}deg`,
    );
  }

  return (
    <div
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={(event) => {
        event.currentTarget.style.removeProperty("--scene-tilt-x");
        event.currentTarget.style.removeProperty("--scene-tilt-y");
      }}
    >
      {children}
    </div>
  );
}

export default function LandingMotionControl({
  className,
}: LandingMotionControlProps) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--landing-play-state");
    };
  }, []);

  function toggleMotion() {
    const nextPaused = !paused;
    document.documentElement.style.setProperty(
      "--landing-play-state",
      nextPaused ? "paused" : "running",
    );
    setPaused(nextPaused);
  }

  return (
    <button
      className={className}
      type="button"
      aria-pressed={paused}
      onClick={toggleMotion}
    >
      {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
      {paused ? "Resume motion" : "Pause motion"}
    </button>
  );
}
