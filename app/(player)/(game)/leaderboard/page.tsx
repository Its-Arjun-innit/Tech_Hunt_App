import { Trophy } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { AutoRefresh } from "@/components/auto-refresh";
import { LeaderboardRows } from "@/components/player/leaderboard-rows";

export const metadata = { title: "Leaderboard — Campus Hunt" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const { team, game } = await requirePlayer();
  const rows = await getLeaderboard(game.id);

  return (
    <main className="flex-1 grain">
      <AutoRefresh seconds={15} />

      <header className="border-b border-border/50 bg-surface/80 backdrop-blur-sm px-5 py-6">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Trophy className="size-5 text-primary-strong" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Leaderboard</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {game.leaderboardDelaySeconds > 0
                  ? `Scores shown with a ${Math.round(game.leaderboardDelaySeconds / 60)} minute delay`
                  : `${rows.length} team${rows.length === 1 ? "" : "s"} competing`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-5 py-6">
        <LeaderboardRows rows={rows} myTeamId={team.id} />
      </div>
    </main>
  );
}
