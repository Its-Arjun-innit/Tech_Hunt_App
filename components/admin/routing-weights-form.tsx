"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RoutingConfig } from "@/lib/routing/config";
import { updateRoutingConfig } from "@/app/admin/game/actions";

const LABELS: Record<keyof RoutingConfig, string> = {
  distanceWeight: "Distance reward",
  idealDistanceMeters: "Ideal distance (m)",
  maxDistanceMeters: "Max distance (m)",
  congestionWeight: "Congestion penalty",
  approachingWeight: "Approaching penalty",
  capacityWeight: "At-capacity penalty",
  progressionWeight: "Progression reward",
  difficultyWeight: "Difficulty fit reward",
  routeCompatibilityWeight: "Route match reward",
  recentVisitWeight: "Recent visit penalty",
  recentVisitWindowSeconds: "Recent visit window (s)",
  occupancyWindowSeconds: "Occupancy window (s)",
  reservationTtlSeconds: "Reservation lifetime (s)",
  walkingSpeedMps: "Walking speed (m/s)",
  jitter: "Tie-break jitter",
};

export function RoutingWeightsForm({
  values,
  defaults,
}: {
  values: RoutingConfig;
  defaults: RoutingConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const keys = Object.keys(LABELS) as (keyof RoutingConfig)[];

  return (
    <form
      className="space-y-5"
      action={(formData) =>
        startTransition(async () => {
          const result = await updateRoutingConfig(formData);
          toast[result.ok ? "success" : "error"](result.message);
          router.refresh();
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key} className="text-xs">
              {LABELS[key]}
            </Label>
            <Input
              id={key}
              name={key}
              type="number"
              step="any"
              defaultValue={values[key]}
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">default {defaults[key]}</p>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save routing weights"}
      </Button>
    </form>
  );
}
