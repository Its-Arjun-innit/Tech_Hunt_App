"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, Compass, PartyPopper, Puzzle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/count-up";
import type { ScanOutcome } from "@/lib/game-engine/process-scan";

/**
 * What a player sees the instant a scan resolves.
 *
 * The celebration is deliberately short: every millisecond here is one a team
 * spends standing still, so the sequence lands inside about 900ms.
 *
 * MOTION RULE, and it matters more than the animation does: nothing that
 * carries information animates its opacity from 0. A fade that never runs
 * leaves the clue and the buttons invisible, which mid-game means a team is
 * stuck with a blank screen. So content animates transform only and is
 * readable even if no animation ever fires. Only the tick pop is decorative.
 */
export function ScanResultView({
  outcome,
  onScanAgain,
}: {
  outcome: ScanOutcome;
  onScanAgain: () => void;
}) {
  if (!outcome.ok) return <Rejected outcome={outcome} onScanAgain={onScanAgain} />;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-5 pb-6">
      <div className="pt-6 text-center">
        {/* Scale-only pop. The glyph itself is always rendered. */}
        <motion.span
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="inline-flex size-20 items-center justify-center rounded-full bg-success-subtle"
        >
          <Check className="size-10 text-success-strong" strokeWidth={3} />
        </motion.span>

        <motion.h1
          initial={{ y: 6 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-xl font-semibold"
        >
          Checkpoint complete
        </motion.h1>
        <p className="text-sm text-muted-foreground">{outcome.checkpointName}</p>

        {outcome.pointsAwarded > 0 && (
          <motion.p
            initial={{ y: 12, scale: 0.94 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 16 }}
            className="mt-4 text-display text-success-strong"
          >
            +{outcome.pointsAwarded}
          </motion.p>
        )}

        <p className="mt-1 text-sm text-muted-foreground">
          Team score{" "}
          <span className="font-semibold text-foreground tabular-nums">
            <CountUp value={outcome.teamScore} />
          </span>
        </p>
      </div>

      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-7 space-y-3"
      >
        {outcome.challengeId ? (
          <>
            <Panel icon={Puzzle} tone="warning" title="A challenge waits here">
              Complete it to unlock your next destination.
            </Panel>
            <Button
              className="h-12 w-full text-base"
              render={<Link href={`/challenge/${outcome.challengeId}`} />}
            >
              Start challenge
            </Button>
          </>
        ) : outcome.next ? (
          <>
            <Panel icon={Compass} tone="brand" title="Next destination">
              <span className="block text-base leading-snug text-foreground">
                {outcome.next.clue}
              </span>
              <span className="mt-1.5 block text-xs text-muted-foreground">
                about {Math.max(1, Math.round(outcome.next.estimatedTravelTime / 60))} min walk
              </span>
            </Panel>
            <Button className="h-12 w-full text-base" render={<Link href="/clue" />}>
              View next clue <ArrowRight className="size-4" />
            </Button>
            <Button variant="ghost" className="h-11 w-full" render={<Link href="/dashboard" />}>
              Back to home
            </Button>
          </>
        ) : (
          <>
            <Panel
              icon={PartyPopper}
              tone="brand"
              title={outcome.finished ? "That was the last one" : "No destination yet"}
            >
              {outcome.finished
                ? "You have completed every checkpoint. Outstanding."
                : "No further destination is available right now. Check with an organizer."}
            </Panel>
            <Button className="h-12 w-full text-base" render={<Link href="/dashboard" />}>
              Back to home
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Rejected({
  outcome,
  onScanAgain,
}: {
  outcome: Extract<ScanOutcome, { ok: false }>;
  onScanAgain: () => void;
}) {
  // Each rejection gets the recovery action that actually helps.
  const recovery =
    outcome.result === "WRONG_CHECKPOINT" || outcome.result === "DUPLICATE"
      ? { href: "/clue", label: "Re-read my clue" }
      : { href: "/dashboard", label: "Back to home" };

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-5 pb-6">
      <div className="pt-8 text-center">
        <motion.span
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          className="inline-flex size-16 items-center justify-center rounded-full bg-danger-subtle"
        >
          <AlertCircle className="size-8 text-danger" />
        </motion.span>
        <h1 className="mt-4 text-lg font-semibold">Scan not accepted</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">{outcome.message}</p>
      </div>

      <div className="mt-7 space-y-3">
        <Button className="h-12 w-full text-base" onClick={onScanAgain}>
          <QrCode className="size-4" /> Scan again
        </Button>
        <Button variant="outline" className="h-11 w-full" render={<Link href={recovery.href} />}>
          {recovery.label}
        </Button>
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "brand" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border p-4 ${
        tone === "brand" ? "border-primary/30 bg-primary/5" : "border-warning/40 bg-warning-subtle"
      }`}
    >
      <p
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${
          tone === "brand" ? "text-primary-strong" : "text-warning-foreground dark:text-warning"
        }`}
      >
        <Icon className="size-3.5" />
        {title}
      </p>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
