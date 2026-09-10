import Link from "next/link";
import {
  Activity, Award, Bell, CheckCircle2, Clock, Flag, Lightbulb,
  QrCode, Trophy, Users,
} from "lucide-react";
import { requirePlayer, touchPlayer } from "@/lib/auth/player";
import { prisma } from "@/lib/db";
import { currentObjective } from "@/lib/game-engine/clues";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameTimer } from "@/components/player/game-timer";
import { ClueCard } from "@/components/player/clue-card";
import { playerLogout } from "../login/actions";

export const metadata = { title: "Dashboard — Campus Treasure Hunt" };
export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 3 * 60_000;

export default async function DashboardPage() {
  const { player, team, game } = await requirePlayer();
  await touchPlayer(player.id);

  const [objective, members, completedScans, challengeCount, leaderboard, announcements, activity, totalCheckpoints] =
    await Promise.all([
      currentObjective(team.id),
      prisma.player.findMany({
        where: { teamId: team.id },
        select: { id: true, name: true, lastActiveAt: true },
        orderBy: { name: "asc" },
      }),
      prisma.scanEvent.count({ where: { teamId: team.id, result: "SUCCESS" } }),
      prisma.challengeAttempt.count({ where: { teamId: team.id, status: "SUCCESS" } }),
      getLeaderboard(game.id),
      prisma.announcement.findMany({
        where: { gameId: game.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.gameEvent.findMany({
        where: { teamId: team.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.checkpoint.count({ where: { gameId: game.id, active: true } }),
    ]);

  const rank = leaderboard.find((r) => r.teamId === team.id)?.rank ?? leaderboard.length;
  const myAnnouncements = announcements.filter(
    (a) => a.teamIds.length === 0 || a.teamIds.includes(team.id),
  );
  const now = Date.now();

  const pendingChallenge = objective?.checkpoint.challenge?.active
    ? objective.checkpoint.challenge
    : null;

  return (
    <main className="flex-1 pb-24">
      <AutoRefresh seconds={8} />

      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Signed in as {player.name}</p>
            <h1 className="text-lg font-semibold truncate">{team.name}</h1>
          </div>
          <form action={playerLogout}>
            <Button variant="ghost" size="sm" type="submit">Sign out</Button>
          </form>
        </div>
      </header>

      <div className="px-5 pt-5 space-y-5 max-w-lg mx-auto w-full">
        <GameStatusBanner status={game.status} />

        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Trophy className="size-4" />} label="Score" value={team.score} />
          <Stat icon={<Award className="size-4" />} label="Rank" value={`#${rank}`} />
          <Stat
            icon={<Flag className="size-4" />}
            label="Checkpoints"
            value={`${completedScans}/${totalCheckpoints}`}
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4" /> Game timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GameTimer
              status={game.status}
              startsAt={game.startsAt?.toISOString() ?? null}
              endsAt={game.endsAt?.toISOString() ?? null}
            />
          </CardContent>
        </Card>

        {/* Current objective: either finish the challenge here, or travel. */}
        {pendingChallenge ? (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="size-4" /> Challenge waiting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Complete <strong>{pendingChallenge.title}</strong> before you move on.
              </p>
              <Button  className="w-full h-11" render={<Link href={`/challenge/${pendingChallenge.id}`} />}>Open challenge</Button>
            </CardContent>
          </Card>
        ) : objective ? (
          <ClueCard
            clue={objective.clue?.text ?? "Awaiting your next destination."}
            level={objective.level}
            maxLevel={objective.maxLevel}
            canRequestMore={objective.canRequestMore}
            requestCost={objective.requestCost}
            estimatedTravelTime={objective.estimatedTravelTime}
          />
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Flag className="size-4" /> Your objective
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {completedScans > 0
                ? "You have visited every checkpoint. Well played!"
                : "Find your first checkpoint QR code and scan it to begin."}
            </CardContent>
          </Card>
        )}

        {myAnnouncements.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Bell className="size-4" /> Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myAnnouncements.map((a) => (
                <div key={a.id} className="text-sm">
                  <p>{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Users className="size-4" /> Team members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => {
              const online =
                m.lastActiveAt && now - m.lastActiveAt.getTime() < ONLINE_WINDOW_MS;
              return (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className={m.id === player.id ? "font-medium" : ""}>{m.name}</span>
                  <Badge variant="outline" className="gap-1.5 text-xs font-normal">
                    <span
                      className={`size-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                    />
                    {online ? "Online" : "Offline"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Activity className="size-4" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet. Go scan something.</p>
            ) : (
              activity.map((e) => (
                <div key={e.id} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate">{e.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <p className="text-xs text-muted-foreground pt-1">
              {challengeCount} challenge{challengeCount === 1 ? "" : "s"} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Thumb-reachable primary action. */}
      <nav className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur px-5 py-3">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button  className="flex-1 h-12 text-base" render={<Link href="/scan" />}><QrCode className="size-5" /> Scan QR</Button>
          <Button  variant="outline" className="h-12" render={<Link href="/leaderboard" />}><Trophy className="size-5" />
              <span className="sr-only">Leaderboard</span></Button>
        </div>
      </nav>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="px-3 py-4 text-center">
        <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function GameStatusBanner({ status }: { status: string }) {
  if (status === "ACTIVE") return null;
  const copy: Record<string, string> = {
    DRAFT: "The game has not started yet.",
    PAUSED: "The game is paused. Scanning is disabled.",
    ENDED: "The game has ended. Final scores are locked.",
  };
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      {copy[status] ?? status}
    </div>
  );
}
