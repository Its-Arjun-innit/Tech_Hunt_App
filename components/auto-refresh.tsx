"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a Server Component page fresh without a websocket. Pauses while the
 * tab is hidden so phones in a pocket do not burn battery or data.
 *
 * ponytail: swap for a Supabase Realtime subscription that calls the same
 * router.refresh() once a Supabase project exists.
 */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);

  return null;
}
