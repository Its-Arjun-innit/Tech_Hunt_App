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
    <main className="flex-1">
      <AutoRefresh seconds={15} />

      <header className="border-b bg-surface px-5 py-5">
        <div className="mx-auto max-w-lg">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Trophy className="size-5 text-muted-foreground" /> Leaderboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {game.leaderboardDelaySeconds > 0
              ? `Scores are shown with a ${Math.round(game.leaderboardDelaySeconds / 60)} minute delay, so the very latest scans are not counted yet.`
              : `${rows.length} team${rows.length === 1 ? "" : "s"} competing.`}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-5 py-5">
        <LeaderboardRows rows={rows} myTeamId={team.id} />
      </div>
    </main>
  );
}
