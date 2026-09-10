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

/** Counts down to the end time, or up from the start when no end is set. */
export function GameTimer({
  status,
  startsAt,
  endsAt,
}: {
  status: string;
  startsAt: string | null;
  endsAt: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "ACTIVE") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (status === "ENDED") {
    return <p className="text-2xl font-semibold tabular-nums">Finished</p>;
  }
  if (!startsAt) {
    return <p className="text-sm text-muted-foreground">Waiting for the organizer to start.</p>;
  }

  const start = new Date(startsAt).getTime();
  if (now < start) {
    return (
      <div>
        <p className="text-2xl font-semibold tabular-nums">{format(start - now)}</p>
        <p className="text-xs text-muted-foreground">until the hunt begins</p>
      </div>
    );
  }

  if (endsAt) {
    const end = new Date(endsAt).getTime();
    const remaining = end - now;
    return (
      <div>
        <p
          className={`text-2xl font-semibold tabular-nums ${remaining < 300_000 ? "text-destructive" : ""}`}
        >
          {format(remaining)}
        </p>
        <p className="text-xs text-muted-foreground">remaining</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{format(now - start)}</p>
      <p className="text-xs text-muted-foreground">elapsed</p>
    </div>
  );
}
