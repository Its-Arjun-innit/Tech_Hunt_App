"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Animates a number towards its new value.
 *
 * Scores change while a player is looking at them, and a silent jump reads as
 * a page reload rather than points being earned. Uses requestAnimationFrame
 * rather than a motion value so the digits stay plain text and remain
 * selectable and screen-reader friendly.
 */
export function CountUp({
  value,
  durationMs = 700,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    if (reduced) {
      fromRef.current = value;
      setShown(value);
      return;
    }

    const start = performance.now();
    const tick = (nowTs: number) => {
      const t = Math.min(1, (nowTs - start) / durationMs);
      // Ease out: fast at first, settling at the end.
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, durationMs, reduced]);

  return (
    <span className={className} suppressHydrationWarning>
      {shown.toLocaleString()}
    </span>
  );
}
