import { Flag, Puzzle, Trophy, Users } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { prisma } from "@/lib/db";
import { currentTask } from "@/lib/game-engine/clues";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { playerLogout } from "@/app/(player)/login/actions";

export const metadata = { title: "Your team — Campus Hunt" };
export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 3 * 60_000;

export default async function TeamPage() {
  const { player, team, game } = await requirePlayer();

  const [members, completedScans, challengeCount, leaderboard, totalCheckpoints, task] =
    await Promise.all([
      prisma.player.findMany({
        where: { teamId: team.id },
        select: { id: true, name: true, lastActiveAt: true, status: true },
        orderBy: { name: "asc" },
      }),
      prisma.scanEvent.count({ where: { teamId: team.id, result: "SUCCESS" } }),
      prisma.challengeAttempt.count({ where: { teamId: team.id, status: "SUCCESS" } }),
      getLeaderboard(game.id),
      prisma.checkpoint.count({ where: { gameId: game.id, active: true } }),
      currentTask(team.id),
    ]);

  const rank = leaderboard.find((r) => r.teamId === team.id)?.rank ?? leaderboard.length;
  const now = Date.now();
  const online = members.filter(
    (m) => m.lastActiveAt && now - m.lastActiveAt.getTime() < ONLINE_WINDOW_MS,
  ).length;

  return (
    <main className="flex-1">
      <AutoRefresh seconds={15} />

      <header className="border-b bg-surface px-5 py-5">
        <div className="mx-auto max-w-lg">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your team
          </p>
          <h1 className="text-2xl font-semibold">{team.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} · {online} online
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-4 px-5 py-5">
        <div className="grid grid-cols-3 gap-3">
          <Tile icon={<Trophy className="size-3.5" />} label="Score" value={team.score} />
          <Tile icon={<Users className="size-3.5" />} label="Rank" value={`#${rank}`} />
          <Tile
            icon={<Flag className="size-3.5" />}
            label="Checkpoints"
            value={`${completedScans}/${totalCheckpoints}`}
          />
        </div>

        <section className="rounded-xl border bg-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Members
          </h2>
          <ul className="mt-3 space-y-2.5">
            {members.map((m) => {
              const isOnline =
                m.lastActiveAt && now - m.lastActiveAt.getTime() < ONLINE_WINDOW_MS;
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      isOnline ? "bg-success" : "bg-faint-foreground/50"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {m.name}
                    {m.id === player.id && (
                      <span className="ml-1.5 text-xs text-muted-foreground">you</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {m.status !== "ACTIVE" ? "Disabled" : isOnline ? "Online" : "Offline"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border bg-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Progress
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Checkpoints completed" value={`${completedScans} of ${totalCheckpoints}`} />
            <Row
              label="Challenges completed"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Puzzle className="size-3.5 text-muted-foreground" />
                  {challengeCount}
                </span>
              }
            />
            <Row
              label="Current objective"
              value={
                task.kind === "challenge"
                  ? `Finish ${task.title}`
                  : task.kind === "travel"
                    ? "Travelling to your next clue"
                    : task.kind === "finished"
                      ? "Finished"
                      : "Not started"
              }
            />
          </dl>
        </section>

        <form action={playerLogout}>
          <Button variant="outline" type="submit" className="h-11 w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-surface px-3 py-3 text-center">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
