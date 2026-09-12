"use client";

import Link from "next/link";
import { CheckCircle2, Compass, Flag, QrCode, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ScanOutcome } from "@/lib/game-engine/process-scan";

export function ScanResultView({
  outcome,
  onScanAgain,
}: {
  outcome: ScanOutcome;
  onScanAgain: () => void;
}) {
  if (!outcome.ok) {
    return (
      <div className="flex-1 p-5 max-w-lg mx-auto w-full space-y-5">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-center space-y-3">
            <XCircle className="size-12 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">Scan rejected</h2>
            <p className="text-sm text-muted-foreground">{outcome.message}</p>
          </CardContent>
        </Card>
        <Button className="w-full h-12" onClick={onScanAgain}>
          <QrCode className="size-4" /> Try again
        </Button>
        <Button  variant="outline" className="w-full h-11" render={<Link href="/dashboard" />}>Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 max-w-lg mx-auto w-full space-y-5">
      <Card className="border-success/40 bg-success-subtle/50">
        <CardContent className="pt-6 text-center space-y-2">
          <CheckCircle2 className="size-12 mx-auto text-success-strong" />
          <h2 className="text-lg font-semibold">Checkpoint completed!</h2>
          <p className="text-sm text-muted-foreground">{outcome.checkpointName}</p>
          <p className="text-3xl font-bold text-success-strong tabular-nums">
            +{outcome.pointsAwarded}
          </p>
          <p className="text-sm text-muted-foreground">
            Team score: {outcome.teamScore}
          </p>
        </CardContent>
      </Card>

      {outcome.challengeId ? (
        <>
          <Card className="border-warning/40 bg-warning-subtle/60">
            <CardContent className="pt-6 space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Flag className="size-4" /> A challenge waits here
              </p>
              <p className="text-sm text-muted-foreground">
                Complete it to unlock your next destination.
              </p>
            </CardContent>
          </Card>
          <Button  className="w-full h-12" render={<Link href={`/challenge/${outcome.challengeId}`} />}>Start challenge</Button>
        </>
      ) : outcome.next ? (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Compass className="size-4" /> Your next destination
              </p>
              <p className="text-lg leading-snug">{outcome.next.clue}</p>
              <p className="text-xs text-muted-foreground">
                about {Math.max(1, Math.round(outcome.next.estimatedTravelTime / 60))} min walk
              </p>
            </CardContent>
          </Card>
          <Button  className="w-full h-12" render={<Link href="/dashboard" />}>Got it</Button>
        </>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm">
                {outcome.finished
                  ? "You have completed every checkpoint. Outstanding!"
                  : "No further destination is available right now."}
              </p>
            </CardContent>
          </Card>
          <Button  className="w-full h-12" render={<Link href="/dashboard" />}>Back to dashboard</Button>
        </>
      )}
    </div>
  );
}
