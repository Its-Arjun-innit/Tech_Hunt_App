"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Counts down to the end time, or up from the start when no end is set.
 *
 * The clock is client-only: elapsed time differs between the server render
 * and the browser, so rendering it during SSR throws a hydration error.
 */
export function GameTimer({
  status,
  startsAt,
  endsAt,
  compact = false,
}: {
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  /** Inline treatment for the player header strip. */
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (status !== "ACTIVE") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const big = compact
    ? "text-base font-semibold tabular-nums"
    : "text-2xl font-semibold tabular-nums";
  const caption = compact ? "text-xs text-muted-foreground" : "text-xs text-muted-foreground";

  if (status === "ENDED") return <p className={big}>Finished</p>;

  if (!mounted) {
    return <p className={`${big} text-muted-foreground`}>--:--</p>;
  }
  if (!startsAt) {
    return <p className={caption}>Waiting for the organizer to start.</p>;
  }

  const start = new Date(startsAt).getTime();
  if (now < start) {
    return (
      <div className={compact ? "flex items-baseline gap-1.5" : undefined}>
        <p className={big}>{format(start - now)}</p>
        <p className={caption}>until the hunt begins</p>
      </div>
    );
  }

  if (endsAt) {
    const remaining = new Date(endsAt).getTime() - now;
    const urgent = remaining < 300_000;
    return (
      <div className={compact ? "flex items-baseline gap-1.5" : undefined}>
        <p className={`${big} ${urgent ? "text-danger" : ""}`}>{format(remaining)}</p>
        <p className={caption}>remaining</p>
      </div>
    );
  }

  return (
    <div className={compact ? "flex items-baseline gap-1.5" : undefined}>
      <p className={big}>{format(now - start)}</p>
      <p className={caption}>elapsed</p>
    </div>
  );
}
