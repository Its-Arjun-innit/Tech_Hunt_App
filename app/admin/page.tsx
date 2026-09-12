import Link from "next/link";
import { Activity, Flag, Gamepad2, QrCode, Radio, Trophy, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { prisma } from "@/lib/db";
import { getCheckpointTraffic } from "@/lib/routing/traffic";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameTimer } from "@/components/player/game-timer";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 3 * 60_000;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const game = await getCurrentGame();

  if (!game) {
    return (
      <EmptyState
        icon={Gamepad2}
        title="No game yet"
        description="A game holds the teams, checkpoints and rules. Create one to begin setting up the hunt."
        action={<Button render={<Link href="/admin/game" />}>Create a game</Button>}
      />
    );
  }

  const [teams, playersOnline, totalScans, completedCheckpoints, traffic, leaderboard, recent] =
    await Promise.all([
      prisma.team.count({ where: { gameId: game.id, status: "ACTIVE" } }),
      prisma.player.count({
        where: {
          team: { gameId: game.id },
          lastActiveAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) },
        },
      }),
      prisma.scanEvent.count({ where: { team: { gameId: game.id } } }),
      prisma.scanEvent.count({ where: { team: { gameId: game.id }, result: "SUCCESS" } }),
      getCheckpointTraffic(game.id),
      getLeaderboard(game.id),
      prisma.gameEvent.findMany({
        where: { gameId: game.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const states = [...traffic.values()];
  const congested = states.filter((t) => t.state === "RED").length;
  const approaching = states.filter((t) => t.state === "YELLOW").length;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={game.name}
        description="Live overview"
        actions={
          <>
            <AutoRefresh seconds={8} showIndicator />
            <Badge variant={game.status === "ACTIVE" ? "default" : "secondary"}>
              {game.status}
            </Badge>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:h-full">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Countdown</CardTitle>
          </CardHeader>
          <CardContent>
            <GameTimer
              status={game.status}
              startsAt={game.startsAt?.toISOString() ?? null}
              endsAt={game.endsAt?.toISOString() ?? null}
            />
          </CardContent>
        </Card>

        <Stat icon={<Users className="size-4" />} label="Active teams" value={teams} />
        <Stat icon={<Radio className="size-4" />} label="Players online" value={playersOnline} />
        <Stat icon={<QrCode className="size-4" />} label="Total scans" value={totalScans} />
        <Stat
          icon={<Flag className="size-4" />}
          label="Checkpoints completed"
          value={completedCheckpoints}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Congestion</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 text-sm">
            <span className="text-danger font-medium">{congested} red</span>
            <span className="text-warning-foreground dark:text-warning font-medium">{approaching} yellow</span>
            <span className="text-success-strong font-medium">
              {states.length - congested - approaching} clear
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="size-4" /> Standings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No teams yet"
                description="Standings appear once teams exist and start scanning."
                action={
                  <Button size="sm" variant="outline" render={<Link href="/admin/teams" />}>
                    Add teams
                  </Button>
                }
              />
            ) : (
              leaderboard.slice(0, 6).map((row) => (
                <div key={row.teamId} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-muted-foreground tabular-nums">{row.rank}</span>
                  <span className="flex-1 truncate">{row.teamName}</span>
                  <span className="text-muted-foreground">{row.checkpoints} cp</span>
                  <span className="font-medium tabular-nums w-12 text-right">{row.points}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="size-4" /> Recent events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Nothing has happened yet"
                description="Scans, challenges and redirects show up here as teams play."
              />
            ) : (
              recent.map((e) => (
                <div key={e.id} className="flex items-start gap-2 text-sm">
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 pt-0.5">
                    {e.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="min-w-0 truncate">{e.message}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
