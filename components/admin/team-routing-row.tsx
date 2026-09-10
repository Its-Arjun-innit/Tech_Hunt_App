"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { redirectTeam, rerouteTeam } from "@/app/admin/teams/actions";

type TeamRouting = {
  id: string;
  name: string;
  status: string;
  score: number;
  currentCheckpoint: string | null;
  destination: string | null;
  destinationId: string | null;
  reason: string | null;
  etaSeconds: number | null;
  expired: boolean;
};

export function TeamRoutingRow({
  team,
  checkpoints,
}: {
  team: TeamRouting;
  checkpoints: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReason, setShowReason] = useState(false);
  const [target, setTarget] = useState(team.destinationId ?? checkpoints[0]?.id ?? "");

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await fn();
      toast[result.ok ? "success" : "error"](result.message);
      router.refresh();
    });

  return (
    <div className="rounded-md border px-3 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium min-w-0 truncate">{team.name}</span>
        {team.status !== "ACTIVE" && (
          <Badge variant="secondary" className="text-xs">
            {team.status}
          </Badge>
        )}

        <span className="text-muted-foreground">
          {team.currentCheckpoint ?? "not started"}
        </span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className={team.destination ? "font-medium" : "text-muted-foreground"}>
          {team.destination ?? "no destination"}
        </span>

        {team.expired && (
          <Badge variant="outline" className="text-xs text-amber-600">
            reservation expired
          </Badge>
        )}
        {team.etaSeconds !== null && team.destination && (
          <span className="text-xs text-muted-foreground">
            ~{Math.max(1, Math.round(team.etaSeconds / 60))} min
          </span>
        )}

        <span className="ml-auto font-semibold tabular-nums">{team.score}</span>

        {team.reason && (
          <Button
            size="sm"
            variant="ghost"
            title="Why this destination?"
            onClick={() => setShowReason((v) => !v)}
          >
            <Info className="size-3.5" />
          </Button>
        )}
      </div>

      {showReason && team.reason && (
        <p className="rounded bg-muted px-3 py-2 text-xs text-muted-foreground">{team.reason}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm max-w-48"
        >
          {checkpoints.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <Button
          size="sm"
          variant="outline"
          disabled={pending || !target}
          onClick={() => run(() => redirectTeam(team.id, target))}
        >
          Send here
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          title="Let the engine choose again"
          onClick={() => run(() => rerouteTeam(team.id))}
        >
          <Shuffle className="size-3.5" /> Reroute
        </Button>
      </div>
    </div>
  );
}
