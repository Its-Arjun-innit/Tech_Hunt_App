"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TrafficBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import type { TrafficState } from "@/lib/routing/traffic";

export type CheckpointRow = {
  id: string;
  name: string;
  routeGroup: string | null;
  points: number;
  capacity: number;
  difficulty: number;
  active: boolean;
  clues: number;
  routes: number;
  scans: number;
  challenge: string | null;
  state: TrafficState;
  occupancy: number;
  approaching: number;
};

export function CheckpointsTable({ rows }: { rows: CheckpointRow[] }) {
  const router = useRouter();

  const columns: Column<CheckpointRow>[] = [
    {
      key: "traffic",
      header: "Traffic",
      headerClassName: "w-0",
      sortValue: (r) => r.state,
      cell: (r) => <TrafficBadge state={r.state} />,
    },
    {
      key: "name",
      header: "Checkpoint",
      sortValue: (r) => r.name,
      searchValue: (r) => `${r.name} ${r.routeGroup ?? ""} ${r.challenge ?? ""}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium truncate">{r.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {r.clues} clue{r.clues === 1 ? "" : "s"} · {r.routes} route
            {r.routes === 1 ? "" : "s"}
            {r.routeGroup && ` · ${r.routeGroup}`}
          </p>
        </div>
      ),
    },
    {
      key: "points",
      header: "Points",
      sortValue: (r) => r.points,
      cell: (r) => <span className="tabular-nums">{r.points}</span>,
    },
    {
      key: "teams",
      header: "Teams",
      sortValue: (r) => r.occupancy + r.approaching,
      cell: (r) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {r.occupancy}/{r.capacity} here
          {r.approaching > 0 && ` · ${r.approaching} coming`}
        </span>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      sortValue: (r) => r.difficulty,
      cell: (r) => (
        <span className="text-xs text-muted-foreground" title={`Difficulty ${r.difficulty} of 5`}>
          {"●".repeat(r.difficulty)}
          <span className="text-faint-foreground">{"○".repeat(5 - r.difficulty)}</span>
        </span>
      ),
    },
    {
      key: "challenge",
      header: "Challenge",
      sortValue: (r) => r.challenge ?? "",
      cell: (r) =>
        r.challenge ? (
          <Badge variant="secondary" className="text-xs">
            {r.challenge.replace("_", " ")}
          </Badge>
        ) : (
          <span className="text-xs text-faint-foreground">none</span>
        ),
    },
    {
      key: "scans",
      header: "Scans",
      sortValue: (r) => r.scans,
      cell: (r) => <span className="tabular-nums text-muted-foreground">{r.scans}</span>,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      searchPlaceholder="Search checkpoints"
      onRowClick={(r) => router.push(`/admin/checkpoints/${r.id}`)}
    />
  );
}
