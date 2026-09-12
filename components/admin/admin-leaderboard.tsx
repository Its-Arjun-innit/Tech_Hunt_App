"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill, TrafficBadge } from "@/components/status-badge";
import type { TrafficState } from "@/lib/routing/traffic";
import { adjustScore } from "@/app/admin/leaderboard/actions";

type Row = {
  rank: number;
  teamId: string;
  teamName: string;
  points: number;
  liveScore: number;
  checkpoints: number;
  challenges: number;
  status: string;
  finalRank: number | null;
  location: string | null;
  destination: string | null;
  destinationTraffic: TrafficState | null;
  lastActivity: string | null;
};

export function AdminLeaderboard({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");

  const submit = () =>
    startTransition(async () => {
      if (!adjusting) return;
      const result = await adjustScore({
        teamId: adjusting.teamId,
        points: Number(points),
        reason,
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setAdjusting(null);
        setPoints("");
        setReason("");
      }
      router.refresh();
    });

  const columns: Column<Row>[] = [
    {
      key: "rank",
      header: "#",
      headerClassName: "w-0",
      sortValue: (r) => r.rank,
      cell: (r) => <span className="font-semibold tabular-nums">{r.rank}</span>,
    },
    {
      key: "team",
      header: "Team",
      sortValue: (r) => r.teamName,
      searchValue: (r) => r.teamName,
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-medium">{r.teamName}</span>
          {r.status !== "ACTIVE" && (
            <StatusPill tone={r.status === "FINISHED" ? "info" : "danger"}>
              {r.status.toLowerCase()}
            </StatusPill>
          )}
        </span>
      ),
    },
    {
      key: "score",
      header: "Score",
      sortValue: (r) => r.liveScore,
      cell: (r) => (
        <span className="font-semibold tabular-nums">
          {r.liveScore.toLocaleString()}
          {/* Players may be seeing a delayed number; show both when they differ. */}
          {r.points !== r.liveScore && (
            <span
              className="ml-1.5 text-xs font-normal text-muted-foreground"
              title="What players currently see, under the leaderboard delay"
            >
              ({r.points.toLocaleString()} shown)
            </span>
          )}
        </span>
      ),
    },
    {
      key: "checkpoints",
      header: "CP",
      sortValue: (r) => r.checkpoints,
      cell: (r) => <span className="tabular-nums text-muted-foreground">{r.checkpoints}</span>,
    },
    {
      key: "challenges",
      header: "Ch",
      sortValue: (r) => r.challenges,
      cell: (r) => <span className="tabular-nums text-muted-foreground">{r.challenges}</span>,
    },
    {
      key: "route",
      header: "Location → destination",
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">{r.location ?? "not started"}</span>
          <ArrowRight className="size-3 shrink-0 text-faint-foreground" />
          <span>{r.destination ?? "none"}</span>
          {r.destinationTraffic && <TrafficBadge state={r.destinationTraffic} compact />}
        </span>
      ),
    },
    {
      key: "lastActivity",
      header: "Last scan",
      sortValue: (r) => r.lastActivity ?? "",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.lastActivity
            ? new Date(r.lastActivity).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-0",
      cell: (r) => (
        <Button
          size="sm"
          variant="ghost"
          title={`Adjust ${r.teamName}'s score`}
          onClick={() => {
            setAdjusting(r);
            setPoints("");
            setReason("");
          }}
        >
          <SlidersHorizontal className="size-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.teamId}
        searchPlaceholder="Search team"
        initialSort={{ key: "rank", direction: "asc" }}
      />

      <Drawer
        open={adjusting !== null}
        onOpenChange={(open) => !open && setAdjusting(null)}
        title={adjusting ? `Adjust ${adjusting.teamName}` : ""}
        description="Written to the score ledger and the audit log, and visible in the team's own activity feed."
      >
        {adjusting && (
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              Current score{" "}
              <span className="font-semibold tabular-nums">
                {adjusting.liveScore.toLocaleString()}
              </span>
              {points && Number.isFinite(Number(points)) && Number(points) !== 0 && (
                <>
                  {" → "}
                  <span className="font-semibold tabular-nums">
                    {(adjusting.liveScore + Number(points)).toLocaleString()}
                  </span>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Adjustment</Label>
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="e.g. 50 or -25"
              />
              <p className="text-xs text-muted-foreground">
                Positive adds points, negative removes them.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Manual award for the relay tie-break agreed with the volunteer at Sports Ground."
              />
              <p className="text-xs text-muted-foreground">
                Required. This is the only way a result changes by hand, so disputes get settled
                from this note.
              </p>
            </div>

            <Button
              className="w-full"
              disabled={pending || !points || Number(points) === 0 || reason.trim().length < 3}
              onClick={submit}
            >
              {pending && <Loader2 className="size-4 motion-safe:animate-spin" />}
              Apply adjustment
            </Button>
          </div>
        )}
      </Drawer>
    </>
  );
}
