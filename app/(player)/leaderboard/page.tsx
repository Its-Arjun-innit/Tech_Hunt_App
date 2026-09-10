import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Leaderboard — Campus Treasure Hunt" };
export const dynamic = "force-dynamic";

const MEDAL = ["bg-amber-400/20 text-amber-700 dark:text-amber-400", "bg-slate-400/20", "bg-orange-500/20"];

export default async function LeaderboardPage() {
  const { team, game } = await requirePlayer();
  const rows = await getLeaderboard(game.id);

  return (
    <main className="flex-1 pb-10">
      <AutoRefresh seconds={15} />

      <header className="flex items-center gap-2 border-b px-3 py-3">
        <Button  variant="ghost" size="sm" render={<Link href="/dashboard" />}><ArrowLeft className="size-4" /> Back</Button>
        <h1 className="font-semibold flex items-center gap-2">
          <Trophy className="size-4" /> Leaderboard
        </h1>
      </header>

      <div className="p-5 max-w-lg mx-auto w-full space-y-2">
        {game.leaderboardDelaySeconds > 0 && (
          <p className="text-xs text-muted-foreground pb-2">
            Scores are shown with a {Math.round(game.leaderboardDelaySeconds / 60)} minute delay.
          </p>
        )}

        {rows.map((row) => (
          <div
            key={row.teamId}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
              row.teamId === team.id ? "border-primary bg-primary/5" : ""
            }`}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                MEDAL[row.rank - 1] ?? "bg-muted"
              }`}
            >
              {row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{row.teamName}</p>
              <p className="text-xs text-muted-foreground">
                {row.checkpoints} checkpoint{row.checkpoints === 1 ? "" : "s"} ·{" "}
                {row.challenges} challenge{row.challenges === 1 ? "" : "s"}
              </p>
            </div>
            <span className="text-lg font-semibold tabular-nums">{row.points}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
