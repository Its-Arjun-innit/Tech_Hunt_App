"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a Server Component page fresh without a websocket. Pauses while the
 * tab is hidden so phones in a pocket do not burn battery or data.
 *
 * ponytail: swap for a Supabase Realtime subscription that calls the same
 * router.refresh() once a Supabase project exists.
 */
export function AutoRefresh({
  seconds = 10,
  showIndicator = false,
}: {
  seconds?: number;
  /** Render a small "updated Xs ago" pill so the data reads as live. */
  showIndicator?: boolean;
}) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [, setTick] = useState(0);
  // The label is clock-derived, so it cannot be server rendered without a
  // hydration mismatch. Hold it back until the client has mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const refresh = useCallback(() => {
    router.refresh();
    setLastRefresh(Date.now());
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, seconds * 1000);

    const onVisible = () => {
      const visible = document.visibilityState === "visible";
      setPaused(!visible);
      if (visible) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    setPaused(document.visibilityState !== "visible");

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, seconds]);

  // Re-render once a second purely to age the label.
  useEffect(() => {
    if (!showIndicator) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [showIndicator]);

  if (!showIndicator || !mounted) return null;

  const age = Math.max(0, Math.round((Date.now() - lastRefresh) / 1000));
  const label = paused ? "Paused" : age < 3 ? "Updated just now" : `Updated ${age}s ago`;

  return (
    <span
      role="status"
      aria-live="off"
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
      title={
        paused
          ? "Updates resume when you return to this tab"
          : `Refreshes every ${seconds} seconds`
      }
    >
      <span className="relative flex size-1.5">
        {!paused && (
          <span className="absolute inline-flex size-full rounded-full bg-success opacity-70 motion-safe:animate-ping" />
        )}
        <span
          className={`relative inline-flex size-1.5 rounded-full ${
            paused ? "bg-muted-foreground/40" : "bg-success"
          }`}
        />
      </span>
      {label}
    </span>
  );
}
