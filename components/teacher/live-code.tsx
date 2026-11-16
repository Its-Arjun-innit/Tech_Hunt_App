"use client";

import { useEffect, useState } from "react";
import { Maximize } from "lucide-react";
import { sessionCode } from "@/app/teacher/actions";

type State = Awaited<ReturnType<typeof sessionCode>> | null;

/**
 * The rotating QR and code. Asks the server for each new window rather than
 * holding the secret, and keeps the screen awake while it is up.
 */
export function LiveCode({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const tick = async () => {
      try {
        const next = await sessionCode(sessionId);
        if (!alive) return;
        setState(next);
        if (!next.closed) timer = setTimeout(tick, next.msLeft + 150);
      } catch {
        if (alive) timer = setTimeout(tick, 3000); // flaky Wi-Fi: keep trying
      }
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [sessionId]);

  // A projector or a phone on the desk must not dim mid-class.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  if (!state) {
    return <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted" aria-label="Loading code" />;
  }
  if (state.closed) return null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={(e) => void (e.currentTarget as HTMLElement).requestFullscreen?.().catch(() => {})}
        className="group relative block w-full rounded-2xl bg-white p-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Show the QR full screen"
      >
        <span className="block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: state.svg }} />
        <span className="absolute right-3 top-3 rounded-md bg-black/60 p-1.5 text-white opacity-80">
          <Maximize className="size-4" />
        </span>
      </button>
      <div className="text-center">
        <p className="font-mono text-5xl font-bold tracking-[0.15em] tabular-nums" aria-live="polite">
          {state.code.slice(0, 3)} {state.code.slice(3)}
        </p>
        {/* key restarts the bar each window; width shrinks by transition only. */}
        <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <Bar key={state.code} ms={state.msLeft} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">New code every 20 seconds</p>
      </div>
    </div>
  );
}

function Bar({ ms }: { ms: number }) {
  const [shrink, setShrink] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShrink(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className="h-full rounded-full bg-primary"
      style={{ width: shrink ? "0%" : `${(ms / 20_000) * 100}%`, transition: `width ${ms}ms linear` }}
    />
  );
}
