"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Fills the latitude / longitude inputs of its form with this device's
 * position. Standing in the room and pressing it beats reading coordinates
 * off a map, which is easy to get 50 m wrong.
 */
export function LocateButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (!form || !navigator.geolocation) return;
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
          (p) => {
            (form.elements.namedItem("latitude") as HTMLInputElement).value = p.coords.latitude.toFixed(6);
            (form.elements.namedItem("longitude") as HTMLInputElement).value = p.coords.longitude.toFixed(6);
            setBusy(false);
          },
          () => setBusy(false),
          { enableHighAccuracy: true, timeout: 15_000 },
        );
      }}
    >
      <LocateFixed className="size-3.5" /> {busy ? "Locating…" : "Use my location"}
    </Button>
  );
}
