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
    <header className="border-b border-border/50 bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto max-w-lg px-5 pt-6 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-faint-foreground">
              Your team
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground truncate">{teamName}</h1>
          </div>
          {status !== "ACTIVE" && (
            <StatusPill tone={gameStatusTone(status)}>{status.toLowerCase()}</StatusPill>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-hero text-primary-strong leading-none">
              <CountUp value={score} />
            </p>
            <p className="mt-1 text-xs font-medium text-faint-foreground">points</p>
          </div>

          <Link
            href="/leaderboard"
            className="group rounded-xl px-3 py-2 text-right outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <p className="flex items-center justify-end gap-1.5 text-2xl font-semibold tabular-nums text-foreground">
              <Trophy className="size-4 text-muted-foreground" />#{rank}
              <ChevronRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
            </p>
            <p className="mt-0.5 text-xs text-faint-foreground">of {totalTeams} teams</p>
          </Link>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-2.5">
          <span className="text-xs font-medium text-faint-foreground">
            {status === "ENDED" ? "Final" : "Time"}
          </span>
          <GameTimer status={status} startsAt={startsAt} endsAt={endsAt} compact />
        </div>
      </div>
    </header>
  );
}
