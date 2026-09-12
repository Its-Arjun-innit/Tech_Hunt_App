import Link from "next/link";
import {
  Activity, Flag, Gamepad2, Puzzle, QrCode, Radio, TriangleAlert, Trophy, Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { prisma } from "@/lib/db";
import { getCheckpointTraffic } from "@/lib/routing/traffic";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { TrafficBadge } from "@/components/status-badge";

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

  const [
    teams, playersOnline, totalScans, completedCheckpoints, activeChallenges,
    traffic, leaderboard, recent, totalPoints, checkpoints,
  ] = await Promise.all([
    prisma.team.count({ where: { gameId: game.id, status: "ACTIVE" } }),
    prisma.player.count({
      where: {
        team: { gameId: game.id },
        lastActiveAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) },
      },
    }),
    prisma.scanEvent.count({ where: { team: { gameId: game.id } } }),
    prisma.scanEvent.count({ where: { team: { gameId: game.id }, result: "SUCCESS" } }),
    prisma.challenge.count({ where: { checkpoint: { gameId: game.id }, active: true } }),
    getCheckpointTraffic(game.id),
    getLeaderboard(game.id),
    prisma.gameEvent.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.scoreEvent.aggregate({
      where: { team: { gameId: game.id } },
      _sum: { points: true },
    }),
    // Fetched once and joined in memory; a query per row would be an N+1 on a
    // page that refreshes every eight seconds.
    prisma.checkpoint.findMany({
      where: { gameId: game.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const states = [...traffic.values()];
  const congested = states.filter((t) => t.state === "RED");
  const approaching = states.filter((t) => t.state === "YELLOW").length;

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="What is happening in the game right now."
        actions={<AutoRefresh seconds={8} showIndicator />}
      />

      {/* The six metrics the brief asks for, in the order an organizer scans. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={Users} label="Active teams" value={teams} />
        <Stat icon={Radio} label="Players online" value={playersOnline} />
        <Stat
          icon={Flag}
          label="Checkpoints completed"
          value={completedCheckpoints}
          hint={`${totalScans} scan attempts in total`}
        />
        <Stat
          icon={Trophy}
          label="Points awarded"
          value={(totalPoints._sum.points ?? 0).toLocaleString()}
          tone="brand"
        />
        <Stat icon={Puzzle} label="Active challenges" value={activeChallenges} />
        <Stat
          icon={TriangleAlert}
          label="Congested checkpoints"
          value={congested.length}
          hint={
            approaching > 0 ? `${approaching} more with teams approaching` : "Nothing backing up"
          }
        />
      </div>

      {congested.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger-subtle p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <TriangleAlert className="size-4 text-danger" />
            {congested.length} checkpoint{congested.length === 1 ? " is" : "s are"} at capacity
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The routing engine already steers around these. Redirect a team by hand if one is
            stuck waiting.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            render={<Link href="/admin/routing" />}
          >
            Open routing
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Standings" icon={Trophy} href="/admin/leaderboard" linkLabel="All teams">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Standings appear once teams start scanning.
            </p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.slice(0, 6).map((row) => (
                <li key={row.teamId} className="flex items-center gap-3 text-sm">
                  <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{row.teamName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.checkpoints} cp
                  </span>
                  <span className="w-14 shrink-0 text-right font-semibold tabular-nums">
                    {row.points.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Live activity" icon={Activity} href="/admin/audit" linkLabel="Audit log">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Scans, challenges and redirects appear here as teams play.
            </p>
          ) : (
            <ol className="space-y-2">
              {recent.map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-sm">
                  <span className="shrink-0 pt-0.5 text-xs tabular-nums text-faint-foreground">
                    {e.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="min-w-0 truncate">{e.message}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel title="Checkpoint traffic" icon={QrCode} href="/admin/map" linkLabel="Live map">
        {checkpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checkpoints yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {checkpoints.map((cp) => {
              const t = traffic.get(cp.id);
              return (
                <Link
                  key={cp.id}
                  href="/admin/map"
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 outline-none transition-colors hover:border-border-strong hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <TrafficBadge state={t?.state ?? "GREEN"} compact />
                  <span className="min-w-0 flex-1 truncate text-sm">{cp.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {t?.occupancy ?? 0}/{t?.capacity ?? 0}
                    {(t?.approaching ?? 0) > 0 && ` · ${t!.approaching}→`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  href,
  linkLabel,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4" /> {title}
        </h2>
        <Button size="sm" variant="ghost" render={<Link href={href} />}>
          {linkLabel}
        </Button>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
