import { Bell, Flag, Puzzle } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { prisma } from "@/lib/db";
import { currentObjective } from "@/lib/game-engine/clues";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { PlayerHeader } from "@/components/player/player-header";
import { ObjectiveCard } from "@/components/player/objective-card";

export const metadata = { title: "Home — Campus Hunt" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { team, game } = await requirePlayer();

  const [objective, completedScans, challengeCount, leaderboard, announcements, totalCheckpoints] =
    await Promise.all([
      currentObjective(team.id),
      prisma.scanEvent.count({ where: { teamId: team.id, result: "SUCCESS" } }),
      prisma.challengeAttempt.count({ where: { teamId: team.id, status: "SUCCESS" } }),
      getLeaderboard(game.id),
      prisma.announcement.findMany({
        where: { gameId: game.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.checkpoint.count({ where: { gameId: game.id, active: true } }),
    ]);

  const rank = leaderboard.find((r) => r.teamId === team.id)?.rank ?? leaderboard.length;
  const mine = announcements.filter(
    (a) => a.teamIds.length === 0 || a.teamIds.includes(team.id),
  );

  const pendingChallenge = objective?.checkpoint.challenge?.active
    ? objective.checkpoint.challenge
    : null;

  return (
    <main className="flex-1">
      <AutoRefresh seconds={8} />

      <PlayerHeader
        teamName={team.name}
        score={team.score}
        rank={rank}
        totalTeams={leaderboard.length}
        status={game.status}
        startsAt={game.startsAt?.toISOString() ?? null}
        endsAt={game.endsAt?.toISOString() ?? null}
      />

      <div className="mx-auto w-full max-w-lg space-y-4 px-5 py-5">
        {game.status !== "ACTIVE" && <GameStateNotice status={game.status} />}

        <ObjectiveCard
          objective={
            pendingChallenge
              ? {
                  kind: "challenge",
                  challengeId: pendingChallenge.id,
                  title: pendingChallenge.title,
                }
              : objective
                ? {
                    kind: "travel",
                    clue: objective.clue?.text ?? "Awaiting your next destination.",
                    level: objective.level,
                    maxLevel: objective.maxLevel,
                    etaSeconds: objective.estimatedTravelTime,
                  }
                : completedScans > 0
                  ? { kind: "finished" }
                  : { kind: "first-scan" }
          }
        />

        {/* Progress, kept small: it answers "how are we doing", not "what now". */}
        <div className="grid grid-cols-2 gap-3">
          <MiniStat
            icon={<Flag className="size-3.5" />}
            label="Checkpoints"
            value={`${completedScans}/${totalCheckpoints}`}
          />
          <MiniStat
            icon={<Puzzle className="size-3.5" />}
            label="Challenges"
            value={challengeCount}
          />
        </div>

        {mine.length > 0 && (
          <section className="rounded-xl border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Bell className="size-3.5" /> Announcements
            </p>
            <ul className="mt-3 space-y-3">
              {mine.map((a) => (
                <li key={a.id}>
                  <p className="text-sm leading-snug">{a.message}</p>
                  <p className="mt-0.5 text-xs text-faint-foreground">
                    {a.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-surface px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function GameStateNotice({ status }: { status: string }) {
  const copy: Record<string, string> = {
    DRAFT: "The hunt has not started yet. Hold tight.",
    PAUSED: "The hunt is paused. Scanning is disabled until an organizer resumes it.",
    ENDED: "The hunt has ended. Scores are final.",
  };
  return (
    <p className="rounded-xl border border-warning/40 bg-warning-subtle px-4 py-3 text-sm">
      {copy[status] ?? status}
    </p>
  );
}
