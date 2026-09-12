import { Trophy } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { getCheckpointTraffic } from "@/lib/routing/traffic";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminLeaderboard } from "@/components/admin/admin-leaderboard";

export const dynamic = "force-dynamic";

export default async function AdminLeaderboardPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) {
    return <EmptyState icon={Trophy} title="No game yet" description="Create a game first." />;
  }

  const [rows, teams, traffic] = await Promise.all([
    getLeaderboard(game.id),
    prisma.team.findMany({
      where: { gameId: game.id },
      select: {
        id: true,
        status: true,
        score: true,
        finalRank: true,
        currentCheckpoint: { select: { id: true, name: true } },
        assignments: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { checkpoint: { select: { id: true, name: true } } },
        },
        scanEvents: {
          where: { result: "SUCCESS" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    getCheckpointTraffic(game.id),
  ]);

  const byId = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="max-w-6xl space-y-6">
      <AutoRefresh seconds={10} showIndicator />

      <PageHeader
        title="Leaderboard"
        description={
          game.leaderboardDelaySeconds > 0
            ? `Players see these scores delayed by ${Math.round(game.leaderboardDelaySeconds / 60)} minutes. You see them live.`
            : "Live standings, with the routing and location detail players never see."
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No teams yet"
          description="Standings appear once teams exist and start scanning."
        />
      ) : (
        <AdminLeaderboard
          rows={rows.map((r) => {
            const team = byId.get(r.teamId);
            const destination = team?.assignments[0]?.checkpoint ?? null;
            const destinationTraffic = destination
              ? (traffic.get(destination.id)?.state ?? "GREEN")
              : null;
            return {
              ...r,
              status: team?.status ?? "ACTIVE",
              liveScore: team?.score ?? r.points,
              finalRank: team?.finalRank ?? null,
              location: team?.currentCheckpoint?.name ?? null,
              destination: destination?.name ?? null,
              destinationTraffic,
              lastActivity: team?.scanEvents[0]?.createdAt.toISOString() ?? null,
            };
          })}
        />
      )}
    </div>
  );
}
