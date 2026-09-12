import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { GameTimer } from "@/components/player/game-timer";
import { StatusPill, gameStatusTone } from "@/components/status-badge";

/**
 * The identity strip at the top of every player tab.
 *
 * Priority order from the brief: what to do now dominates the page below, so
 * this stays compact. Score is the largest thing here, rank sits beside it,
 * and the countdown is legible without stealing the eye.
 */
export function PlayerHeader({
  teamName,
  score,
  rank,
  totalTeams,
  status,
  startsAt,
  endsAt,
}: {
  teamName: string;
  score: number;
  rank: number;
  totalTeams: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
}) {
  return (
    <header className="border-b bg-surface">
      <div className="mx-auto max-w-lg px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your team
            </p>
            <h1 className="text-lg font-semibold truncate">{teamName}</h1>
          </div>
          {status !== "ACTIVE" && (
            <StatusPill tone={gameStatusTone(status)}>{status.toLowerCase()}</StatusPill>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-display text-primary-strong">
              <CountUp value={score} />
            </p>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              points
            </p>
          </div>

          <Link
            href="/leaderboard"
            className="group rounded-lg px-2 py-1 text-right outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <p className="flex items-center justify-end gap-1 text-2xl font-semibold tabular-nums">
              <Trophy className="size-4 text-muted-foreground" />#{rank}
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="text-xs text-muted-foreground">of {totalTeams} teams</p>
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {status === "ENDED" ? "Final" : "Time"}
          </span>
          <GameTimer status={status} startsAt={startsAt} endsAt={endsAt} compact />
        </div>
      </div>
    </header>
  );
}
