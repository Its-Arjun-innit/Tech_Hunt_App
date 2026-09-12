"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";
import type { LeaderboardRow } from "@/lib/scoring/leaderboard";

/**
 * Podium tints are deliberately warm metals, never the brand lime or a status
 * colour, so a rank badge can never be mistaken for a checkpoint state.
 */
const MEDAL = [
  "bg-warning-subtle text-warning-foreground dark:text-warning ring-1 ring-warning/30",
  "bg-muted text-foreground ring-1 ring-border-strong",
  "bg-warning-subtle/60 text-warning-foreground dark:text-warning ring-1 ring-warning/20",
];

/**
 * Live standings. The list animates position changes rather than snapping,
 * because a team overtaking another is the single most motivating moment in
 * the game and it happens while someone is looking at this screen.
 */
export function LeaderboardRows({
  rows,
  myTeamId,
}: {
  rows: LeaderboardRow[];
  myTeamId: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-12 text-center">
        <Trophy className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 font-medium">No teams yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Standings appear once teams start scanning.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      <AnimatePresence initial={false}>
        {rows.map((row) => {
          const mine = row.teamId === myTeamId;
          return (
            <motion.li
              key={row.teamId}
              layout
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                mine ? "border-primary bg-primary/5" : "bg-surface"
              }`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                  MEDAL[row.rank - 1] ?? "bg-muted text-muted-foreground"
                }`}
              >
                {row.rank}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {row.teamName}
                  {mine && (
                    <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-primary-strong">
                      you
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.checkpoints} checkpoint{row.checkpoints === 1 ? "" : "s"} ·{" "}
                  {row.challenges} challenge{row.challenges === 1 ? "" : "s"}
                </p>
              </div>

              <span className="text-lg font-semibold tabular-nums">
                {row.points.toLocaleString()}
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
