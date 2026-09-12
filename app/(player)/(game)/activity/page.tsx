import { Activity, CheckCircle2, Compass, Puzzle, Shuffle, XCircle } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { prisma } from "@/lib/db";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata = { title: "Activity — Campus Hunt" };
export const dynamic = "force-dynamic";

/** Icon and tint per event type, so the feed is scannable at a glance. */
const LOOK: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  CHECKPOINT_COMPLETED: { icon: CheckCircle2, className: "text-success-strong" },
  CHALLENGE_COMPLETED: { icon: Puzzle, className: "text-success-strong" },
  CHALLENGE_REJECTED: { icon: XCircle, className: "text-danger" },
  TEAM_REDIRECTED: { icon: Shuffle, className: "text-warning-foreground dark:text-warning" },
  GAME_STATUS: { icon: Activity, className: "text-muted-foreground" },
};

export default async function ActivityPage() {
  const { team } = await requirePlayer();

  const [events, scores] = await Promise.all([
    prisma.gameEvent.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.scoreEvent.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, points: true, createdAt: true, type: true, note: true },
    }),
  ]);

  // Pair each event with the score change closest in time, so a row can show
  // both what happened and what it was worth.
  const pointsFor = (at: Date) => {
    const match = scores.find((s) => Math.abs(s.createdAt.getTime() - at.getTime()) < 4000);
    return match?.points ?? null;
  };

  // Score-only rows, such as a clue purchase, still deserve a line.
  const standalone = scores.filter(
    (s) =>
      (s.type === "CLUE_COST" || s.type === "ADMIN_ADJUSTMENT" || s.type === "PENALTY") &&
      !events.some((e) => Math.abs(e.createdAt.getTime() - s.createdAt.getTime()) < 4000),
  );

  type Row = {
    id: string;
    at: Date;
    message: string;
    points: number | null;
    type: string;
  };

  const rows: Row[] = [
    ...events.map((e) => ({
      id: e.id,
      at: e.createdAt,
      message: e.message,
      points: pointsFor(e.createdAt),
      type: e.type,
    })),
    ...standalone.map((s) => ({
      id: s.id,
      at: s.createdAt,
      message: s.note ?? "Score adjusted",
      points: s.points,
      type: s.type === "CLUE_COST" ? "CLUE" : "SCORE",
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <main className="flex-1">
      <AutoRefresh seconds={15} />

      <header className="border-b bg-surface px-5 py-5">
        <div className="mx-auto max-w-lg">
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything your team has done, newest first.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-5 py-5">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center">
            <Activity className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 font-medium">Nothing yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Team activity will appear here once the hunt begins.
            </p>
          </div>
        ) : (
          <ol className="space-y-1">
            {rows.map((row) => {
              const look =
                LOOK[row.type] ??
                (row.type === "CLUE"
                  ? { icon: Compass, className: "text-muted-foreground" }
                  : { icon: Activity, className: "text-muted-foreground" });
              const Icon = look.icon;
              return (
                <li
                  key={row.id}
                  className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Icon className={`mt-0.5 size-4 shrink-0 ${look.className}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{row.message}</p>
                    <p className="mt-0.5 text-xs text-faint-foreground">
                      {row.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {row.points !== null && row.points !== 0 && (
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        row.points > 0 ? "text-success-strong" : "text-danger"
                      }`}
                    >
                      {row.points > 0 ? "+" : ""}
                      {row.points}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
