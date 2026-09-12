"use client";

import { MotionConfig } from "framer-motion";

/**
 * One place that makes every Framer Motion animation in the app honour the
 * OS "reduce motion" setting, so individual components never have to guard.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionConfig>
  );
}
