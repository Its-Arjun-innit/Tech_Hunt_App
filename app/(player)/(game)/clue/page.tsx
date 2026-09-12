import Link from "next/link";
import { ArrowLeft, Compass, Footprints } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { prisma } from "@/lib/db";
import { currentObjective } from "@/lib/game-engine/clues";
import { Button } from "@/components/ui/button";
import { ClueLevels } from "@/components/player/clue-levels";

export const metadata = { title: "Your clue — Campus Hunt" };
export const dynamic = "force-dynamic";

export default async function CluePage() {
  const { team, game } = await requirePlayer();
  const objective = await currentObjective(team.id);

  if (!objective) {
    return (
      <main className="flex-1 px-5 py-6">
        <div className="mx-auto max-w-lg space-y-4 text-center">
          <Compass className="mx-auto size-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold">No destination yet</h1>
          <p className="text-sm text-muted-foreground">
            Scan a checkpoint and the routing engine will send you somewhere next.
          </p>
          <Button className="h-12 w-full" render={<Link href="/scan" />}>
            Open scanner
          </Button>
        </div>
      </main>
    );
  }

  // Every level for this destination, so locked ones can be shown as locked
  // rather than hidden. The text of a locked level is never sent to the client.
  const clues = await prisma.clue.findMany({
    where: { checkpointId: objective.checkpoint.id },
    orderBy: { level: "asc" },
    select: { id: true, level: true, text: true },
  });

  const walkMinutes = Math.max(1, Math.round(objective.estimatedTravelTime / 60));

  return (
    <main className="flex-1">
      <header className="flex items-center gap-1 border-b px-3 py-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="size-4" /> Home
        </Button>
      </header>

      <div className="mx-auto w-full max-w-lg px-5 py-6">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-strong">
          <Compass className="size-3.5" /> Next destination
        </p>

        <h1 className="mt-4 text-2xl font-semibold leading-snug text-balance">
          {objective.clue?.text ?? "Awaiting your next destination."}
        </h1>

        <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Footprints className="size-4" />
          about {walkMinutes} min walk from here
        </p>

        <p className="mt-6 rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          Find this location, then scan the QR poster you see there.
        </p>

        <ClueLevels
          levels={clues.map((c) => ({
            level: c.level,
            // Only unlocked text crosses the wire.
            text: c.level <= objective.level ? c.text : null,
          }))}
          currentLevel={objective.level}
          canRequestMore={objective.canRequestMore && game.status === "ACTIVE"}
          requestCost={objective.requestCost}
        />

        <Button className="mt-6 h-12 w-full text-base" render={<Link href="/scan" />}>
          Open scanner
        </Button>
      </div>
    </main>
  );
}
