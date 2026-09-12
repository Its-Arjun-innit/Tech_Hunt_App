"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TrafficState } from "@/lib/routing/traffic";
import { TrafficBadge } from "@/components/status-badge";
import { CheckpointMap } from "./checkpoint-map";
import { moveCheckpoint } from "@/app/admin/checkpoints/actions";
import { Button } from "@/components/ui/button";

export type LivePoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  state: TrafficState;
  teamsHere: string[];
  approachingTeams: string[];
  capacity: number;
  volunteers: string[];
};

export function LiveMap({ apiKey, points }: { apiKey: string; points: LivePoint[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = points.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <CheckpointMap
        apiKey={apiKey}
        points={points}
        height={420}
        value={selected ? { latitude: selected.latitude, longitude: selected.longitude } : null}
        onChange={
          selected
            ? (latitude, longitude) =>
                startTransition(async () => {
                  const result = await moveCheckpoint(selected.id, latitude, longitude);
                  toast[result.ok ? "success" : "error"](result.message);
                  router.refresh();
                })
            : undefined
        }
      />

      {selected && (
        <p className="text-sm text-muted-foreground">
          Moving <strong>{selected.name}</strong>. Click the map or drag the pin.{" "}
          <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)} disabled={pending}>
            Done
          </Button>
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {points.map((p) => (
          <div key={p.id} className="rounded-lg border px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <TrafficBadge state={p.state} />
              <span className="font-medium text-sm truncate flex-1">{p.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
              >
                {p.id === selectedId ? "Cancel" : "Move"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {p.teamsHere.length > 0 ? `Here: ${p.teamsHere.join(", ")}` : "No teams here"} ·
              capacity {p.capacity}
            </p>
            {p.approachingTeams.length > 0 && (
              <p className="text-xs text-warning-foreground dark:text-warning">
                Approaching: {p.approachingTeams.join(", ")}
              </p>
            )}
            {p.volunteers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Volunteers: {p.volunteers.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
