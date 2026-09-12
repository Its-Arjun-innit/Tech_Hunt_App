"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Move, Power, Shuffle, Users } from "lucide-react";
import { toast } from "sonner";
import type { TrafficState } from "@/lib/routing/traffic";
import { TrafficBadge } from "@/components/status-badge";
import { CheckpointMap } from "./checkpoint-map";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmButton } from "@/components/confirm-button";
import { moveCheckpoint, setCheckpointActive } from "@/app/admin/checkpoints/actions";
import { redirectTeam } from "@/app/admin/teams/actions";

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
  active: boolean;
};

export function LiveMap({
  apiKey,
  points,
  teams,
}: {
  apiKey: string;
  points: LivePoint[];
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState("");

  const selected = points.find((p) => p.id === openId) ?? null;
  const moving = points.find((p) => p.id === movingId) ?? null;

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await fn();
      toast[result.ok ? "success" : "error"](result.message);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <CheckpointMap
        apiKey={apiKey}
        points={points}
        height={440}
        value={moving ? { latitude: moving.latitude, longitude: moving.longitude } : null}
        onChange={
          moving
            ? (latitude, longitude) => run(() => moveCheckpoint(moving.id, latitude, longitude))
            : undefined
        }
      />

      {moving && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning-subtle px-3 py-2 text-sm">
          <Move className="size-4 shrink-0" />
          Moving <strong>{moving.name}</strong>. Click the map or drag the pin.
          <Button size="sm" variant="ghost" onClick={() => setMovingId(null)} disabled={pending}>
            Done
          </Button>
        </p>
      )}

      {/* Clicking a checkpoint opens its live detail, per the brief. */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {points.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenId(p.id)}
            className="rounded-xl border bg-surface p-3 text-left outline-none transition-colors hover:border-border-strong hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex items-center gap-2">
              <TrafficBadge state={p.state} compact />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {p.teamsHere.length}/{p.capacity}
              </span>
            </div>
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              {p.teamsHere.length > 0 ? p.teamsHere.join(", ") : "No teams here"}
              {p.approachingTeams.length > 0 && ` · ${p.approachingTeams.length} approaching`}
            </p>
          </button>
        ))}
      </div>

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        title={selected?.name ?? ""}
        description={selected ? `Capacity ${selected.capacity}` : undefined}
      >
        {selected && (
          <div className="space-y-5">
            <TrafficBadge state={selected.state} />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Here now ({selected.teamsHere.length})
              </h3>
              <p className="mt-1.5 text-sm">
                {selected.teamsHere.length > 0 ? selected.teamsHere.join(", ") : "No teams."}
              </p>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Approaching ({selected.approachingTeams.length})
              </h3>
              <p className="mt-1.5 text-sm">
                {selected.approachingTeams.length > 0
                  ? selected.approachingTeams.join(", ")
                  : "Nobody is routed here."}
              </p>
            </section>

            {selected.volunteers.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Volunteers
                </h3>
                <p className="mt-1.5 text-sm">{selected.volunteers.join(", ")}</p>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Send a team here
              </h3>
              <div className="flex gap-2">
                <select
                  value={redirectTarget}
                  onChange={(e) => setRedirectTarget(e.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Choose a team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || !redirectTarget}
                  onClick={() =>
                    run(async () => {
                      const r = await redirectTeam(redirectTarget, selected.id);
                      setRedirectTarget("");
                      return r;
                    })
                  }
                >
                  <Shuffle className="size-3.5" /> Redirect
                </Button>
              </div>
            </section>

            <section className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMovingId(selected.id);
                  setOpenId(null);
                }}
              >
                <Move className="size-3.5" /> Move on map
              </Button>

              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/admin/checkpoints/${selected.id}`} />}
              >
                <ExternalLink className="size-3.5" /> Edit checkpoint
              </Button>

              {selected.active ? (
                <ConfirmButton
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  title={`Disable ${selected.name}?`}
                  description="It stops accepting scans and leaves the routing pool. Any team already heading there loses its destination and will need rerouting."
                  confirmLabel="Disable checkpoint"
                  onConfirm={() => run(() => setCheckpointActive(selected.id, false))}
                >
                  <Power className="size-3.5" /> Disable
                </ConfirmButton>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => setCheckpointActive(selected.id, true))}
                >
                  <Power className="size-3.5" /> Enable
                </Button>
              )}

              <Button size="sm" variant="ghost" render={<Link href="/admin/routing" />}>
                <Users className="size-3.5" /> All routing
              </Button>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
