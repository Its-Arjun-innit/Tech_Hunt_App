"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, Flag, Footprints, PartyPopper, Puzzle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

type Objective =
  | { kind: "challenge"; challengeId: string; title: string }
  | { kind: "travel"; clue: string; level: number; maxLevel: number; etaSeconds: number }
  | { kind: "first-scan" }
  | { kind: "finished" };

/**
 * The single most important element on the player dashboard.
 *
 * The brief's priority order is: what do I do now, then where do I go. So this
 * card leads with the instruction, carries the clue as the largest text on the
 * page, and owns the only primary button. Score and rank sit above it in the
 * header but deliberately smaller.
 */
export function ObjectiveCard({ objective }: { objective: Objective }) {
  return (
    // Transform only: this card is the whole game loop, so it must be readable
    // even if no animation ever runs. See the motion rule in scan-result.tsx.
    <motion.section
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-surface p-5 shadow-sm"
    >
      {/* A quiet lime wash so the card reads as the live one without shouting. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-2xl"
      />

      <div className="relative">
        {objective.kind === "challenge" && (
          <>
            <Label icon={Puzzle}>Challenge at this checkpoint</Label>
            <p className="mt-2 text-xl font-semibold leading-snug">{objective.title}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Finish this to unlock your next destination.
            </p>
            <Button
              className="mt-5 h-12 w-full text-base"
              render={<Link href={`/challenge/${objective.challengeId}`} />}
            >
              Open challenge
            </Button>
          </>
        )}

        {objective.kind === "travel" && (
          <>
            <Label icon={Compass}>Next destination</Label>
            <p className="mt-3 text-xl font-semibold leading-snug text-balance">
              {objective.clue}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Footprints className="size-3.5" />
                about {Math.max(1, Math.round(objective.etaSeconds / 60))} min walk
              </span>
              <span>
                Clue {objective.level} of {objective.maxLevel}
              </span>
            </div>

            <div className="mt-5 grid gap-2">
              <Button className="h-12 w-full text-base" render={<Link href="/clue" />}>
                View clue
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full"
                render={<Link href="/scan" />}
              >
                <QrCode className="size-4" /> I found it, scan
              </Button>
            </div>
          </>
        )}

        {objective.kind === "first-scan" && (
          <>
            <Label icon={Flag}>Start the hunt</Label>
            <p className="mt-2 text-xl font-semibold leading-snug">
              Find any checkpoint poster and scan its code.
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your first scan sets you on a route of your own.
            </p>
            <Button className="mt-5 h-12 w-full text-base" render={<Link href="/scan" />}>
              <QrCode className="size-4" /> Open scanner
            </Button>
          </>
        )}

        {objective.kind === "finished" && (
          <>
            <Label icon={PartyPopper}>All done</Label>
            <p className="mt-2 text-xl font-semibold leading-snug">
              You have completed every checkpoint.
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Well played. Check the leaderboard to see where you landed.
            </p>
            <Button
              variant="outline"
              className="mt-5 h-12 w-full text-base"
              render={<Link href="/leaderboard" />}
            >
              View leaderboard
            </Button>
          </>
        )}
      </div>
    </motion.section>
  );
}

function Label({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-strong">
      <Icon className="size-3.5" />
      {children}
    </p>
  );
}
