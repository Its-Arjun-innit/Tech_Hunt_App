import { Bell, Flag, Puzzle } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { getDashboardData } from "@/lib/queries/dashboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { PlayerHeader } from "@/components/player/player-header";
import { ObjectiveCard } from "@/components/player/objective-card";

export const metadata = { title: "Home — Campus Hunt" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { team, game } = await requirePlayer();

  const { task, completedScans, challengeCount, leaderboard, totalCheckpoints, announcements, rank } =
    await getDashboardData(team.id, game.id);

  return (
    <main className="flex-1 grain">
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

      <div className="mx-auto w-full max-w-lg space-y-5 px-5 py-6">
        {game.status !== "ACTIVE" && <GameStateNotice status={game.status} />}

        <ObjectiveCard
          objective={
            task.kind === "travel"
              ? {
                  kind: "travel",
                  clue: task.clue ?? "Awaiting your next destination.",
                  level: task.level,
                  maxLevel: task.maxLevel,
                  etaSeconds: task.etaSeconds,
                }
              : task
          }
        />

        {/* Progress stats with elevated cards */}
        <div className="grid grid-cols-2 gap-4">
          <MiniStat
            icon={<Flag className="size-4" />}
            label="Checkpoints"
            value={`${completedScans}/${totalCheckpoints}`}
          />
          <MiniStat
            icon={<Puzzle className="size-4" />}
            label="Challenges"
            value={challengeCount}
          />
        </div>

        {announcements.length > 0 && (
          <section className="rounded-2xl border border-border/50 bg-surface/80 p-5 card-elevated transition-all duration-300">
            <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="size-3.5 text-primary-strong" />
              </span>
              Announcements
            </p>
            <ul className="mt-4 space-y-4">
              {announcements.map((a) => (
                <li key={a.id} className="group">
                  <p className="text-sm leading-relaxed text-foreground/90">{a.message}</p>
                  <p className="mt-1 text-xs text-faint-foreground">
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
    <div className="group rounded-2xl border border-border/50 bg-surface/80 px-4 py-4 card-elevated transition-all duration-300 hover:border-border-strong/50">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary-strong">
          {icon}
        </span>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2.5 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
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
    <div className="rounded-2xl border border-warning/30 bg-gradient-to-r from-warning-subtle to-warning-subtle/50 px-5 py-4">
      <p className="text-sm font-medium text-warning-foreground">{copy[status] ?? status}</p>
    </div>
  );
}
