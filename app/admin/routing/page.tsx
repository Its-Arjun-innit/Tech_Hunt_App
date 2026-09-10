import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { getCheckpointTraffic, TRAFFIC_CLASS, TRAFFIC_LABEL } from "@/lib/routing/traffic";
import { AutoRefresh } from "@/components/auto-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { TeamRoutingRow } from "@/components/admin/team-routing-row";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RoutingPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  const [teams, checkpoints, traffic] = await Promise.all([
    prisma.team.findMany({
      where: { gameId: game.id },
      include: {
        currentCheckpoint: { select: { name: true } },
        assignments: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { checkpoint: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.checkpoint.findMany({
      where: { gameId: game.id },
      select: { id: true, name: true, capacity: true, active: true },
      orderBy: { name: "asc" },
    }),
    getCheckpointTraffic(game.id),
  ]);

  const now = Date.now();

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Live routing"
        description="Where each team is and where the engine sent them next."
        actions={<AutoRefresh seconds={6} showIndicator />}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.length === 0 ? (
            <EmptyState icon={Users} title="No teams yet" description="Create teams before routing can do anything." />
          ) : (
            teams.map((team) => {
              const assignment = team.assignments[0];
              const expired = assignment ? assignment.expiresAt.getTime() < now : false;
              return (
                <TeamRoutingRow
                  key={team.id}
                  team={{
                    id: team.id,
                    name: team.name,
                    status: team.status,
                    score: team.score,
                    currentCheckpoint: team.currentCheckpoint?.name ?? null,
                    destination: assignment?.checkpoint.name ?? null,
                    destinationId: assignment?.checkpoint.id ?? null,
                    reason: assignment?.reason ?? null,
                    etaSeconds: assignment?.estimatedTravelTime ?? null,
                    expired,
                  }}
                  checkpoints={checkpoints.map((c) => ({ id: c.id, name: c.name }))}
                />
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Checkpoint traffic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {checkpoints.map((cp) => {
            const t = traffic.get(cp.id);
            const state = t?.state ?? "GREEN";
            return (
              <div key={cp.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TRAFFIC_CLASS[state]}`}
                >
                  {TRAFFIC_LABEL[state]}
                </span>
                <span className="flex-1 truncate text-sm">{cp.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t?.occupancy ?? 0} present · {t?.approaching ?? 0} approaching · capacity{" "}
                  {cp.capacity}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
