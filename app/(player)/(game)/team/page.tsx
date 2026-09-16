import { Flag, Puzzle, Trophy, Users } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { prisma } from "@/lib/db";
import { getDashboardData } from "@/lib/queries/dashboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { playerLogout } from "@/app/(player)/login/actions";

export const metadata = { title: "Your team — Campus Hunt" };
export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 3 * 60_000;

export default async function TeamPage() {
  const { player, team, game } = await requirePlayer();

  const [members, { task, completedScans, challengeCount, totalCheckpoints, rank }] =
    await Promise.all([
      prisma.player.findMany({
        where: { teamId: team.id },
        select: { id: true, name: true, lastActiveAt: true, status: true },
        orderBy: { name: "asc" },
      }),
      getDashboardData(team.id, game.id),
    ]);
  const now = Date.now();
  const online = members.filter(
    (m) => m.lastActiveAt && now - m.lastActiveAt.getTime() < ONLINE_WINDOW_MS,
  ).length;

  return (
    <main className="flex-1 grain">
      <AutoRefresh seconds={15} />

      <header className="border-b border-border/50 bg-surface/80 backdrop-blur-sm px-5 py-6">
        <div className="mx-auto max-w-lg">
          <p className="text-xs font-medium text-faint-foreground">
            Your team
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">{team.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} · {online} online
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-5 px-5 py-6">
        <div className="grid grid-cols-3 gap-4">
          <Tile icon={<Trophy className="size-4" />} label="Score" value={team.score} />
          <Tile icon={<Users className="size-4" />} label="Rank" value={`#${rank}`} />
          <Tile
            icon={<Flag className="size-4" />}
            label="Checkpoints"
            value={`${completedScans}/${totalCheckpoints}`}
          />
        </div>

        <section className="rounded-2xl border border-border/50 bg-surface/80 p-5 card-elevated">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Members
          </h2>
          <ul className="mt-4 space-y-3">
            {members.map((m) => {
              const isOnline =
                m.lastActiveAt && now - m.lastActiveAt.getTime() < ONLINE_WINDOW_MS;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/30">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${
                      isOnline ? "bg-success" : "bg-faint-foreground/40"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {m.name}
                    {m.id === player.id && (
                      <span className="ml-1.5 text-xs font-normal text-faint-foreground">you</span>
                    )}
                  </span>
                  <span className="text-xs text-faint-foreground">
                    {m.status !== "ACTIVE" ? "Disabled" : isOnline ? "Online" : "Offline"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-border/50 bg-surface/80 p-5 card-elevated">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Progress
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
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
          <Button variant="outline" type="submit" className="h-12 w-full rounded-xl">
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
    <div className="group rounded-2xl border border-border/50 bg-surface/80 px-3 py-4 text-center card-elevated transition-all duration-300 hover:border-border-strong/50">
      <div className="flex justify-center text-primary-strong">{icon}</div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-faint-foreground">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/30 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right text-foreground">{value}</dd>
    </div>
  );
}
