import Link from "next/link";
import { Activity, Flag, QrCode, Radio, Trophy, Users } from "lucide-react";
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

export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 3 * 60_000;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const game = await getCurrentGame();

  if (!game) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">No game yet</h1>
        <p className="text-muted-foreground">Create a game to start setting up the hunt.</p>
        <Button render={<Link href="/admin/game" />}>Create a game</Button>
      </div>
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
      <AutoRefresh seconds={8} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{game.name}</h1>
          <p className="text-muted-foreground text-sm">Live overview</p>
        </div>
        <Badge variant={game.status === "ACTIVE" ? "default" : "secondary"}>{game.status}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <span className="text-red-600 font-medium">{congested} red</span>
            <span className="text-amber-600 font-medium">{approaching} yellow</span>
            <span className="text-emerald-600 font-medium">
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
              <p className="text-sm text-muted-foreground">No teams yet.</p>
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
              <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
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
