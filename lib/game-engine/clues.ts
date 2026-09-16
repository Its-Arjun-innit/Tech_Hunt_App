import { prisma } from "@/lib/db";
import { recordScore } from "@/lib/scoring/events";

export type ClueUnlockResult =
  | { ok: true; level: number; text: string; cost: number }
  | { ok: false; message: string };

/**
 * Reveals the next, clearer clue for the team's current destination.
 * Whether that costs points or is time-gated is game configuration, not code.
 */
export async function requestNextClue(args: {
  teamId: string;
  gameId: string;
}): Promise<ClueUnlockResult> {
  return prisma.$transaction(async (tx) => {
    const [game, assignment] = await Promise.all([
      tx.game.findUnique({ where: { id: args.gameId } }),
      tx.routingAssignment.findFirst({
        where: { teamId: args.teamId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { checkpoint: { include: { clues: { orderBy: { level: "asc" } } } } },
      }),
    ]);

    if (!game || game.status !== "ACTIVE") {
      return { ok: false as const, message: "The game is not running." };
    }
    if (!assignment) return { ok: false as const, message: "You have no active destination." };

    const clues = assignment.checkpoint.clues;
    const nextLevel = assignment.clueLevel + 1;
    const next = clues.find((c) => c.level === nextLevel);
    if (!next) return { ok: false as const, message: "This is already the clearest clue." };

    if (game.clueUnlockMode === "TIME") {
      const readyAt = new Date(
        assignment.clueUnlockedAt.getTime() + game.clueUnlockAfterSeconds * 1000,
      );
      if (readyAt > new Date()) {
        const wait = Math.ceil((readyAt.getTime() - Date.now()) / 1000);
        return { ok: false as const, message: `The next clue unlocks in ${wait}s.` };
      }
    }

    const cost = game.clueUnlockMode === "TIME" || game.scoringFrozen ? 0 : game.clueRequestCost;

    if (cost > 0) {
      await recordScore(tx, {
        teamId: args.teamId,
        points: -cost,
        type: "CLUE_COST",
        refId: assignment.id,
        note: `Clue level ${nextLevel} for ${assignment.checkpoint.name}`,
      });
    }

    await tx.routingAssignment.update({
      where: { id: assignment.id },
      data: { clueLevel: nextLevel, clueId: next.id, clueUnlockedAt: new Date() },
    });

    return { ok: true as const, level: nextLevel, text: next.text, cost };
  });
}
