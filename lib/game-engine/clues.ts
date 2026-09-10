import { prisma } from "@/lib/db";

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
      await tx.scoreEvent.create({
        data: {
          teamId: args.teamId,
          type: "CLUE_COST",
          points: -cost,
          refId: assignment.id,
          note: `Clue level ${nextLevel} for ${assignment.checkpoint.name}`,
        },
      });
      await tx.team.update({
        where: { id: args.teamId },
        data: { score: { decrement: cost } },
      });
    }

    await tx.routingAssignment.update({
      where: { id: assignment.id },
      data: { clueLevel: nextLevel, clueId: next.id, clueUnlockedAt: new Date() },
    });

    return { ok: true as const, level: nextLevel, text: next.text, cost };
  });
}

/**
 * The clue the team should currently see, taking automatic time-based
 * unlocking into account without needing a background job.
 */
export async function currentObjective(teamId: string) {
  const assignment = await prisma.routingAssignment.findFirst({
    where: { teamId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      checkpoint: {
        include: { clues: { orderBy: { level: "asc" } }, challenge: true },
      },
    },
  });
  if (!assignment) return null;

  const game = await prisma.game.findFirst({
    where: { teams: { some: { id: teamId } } },
    select: { clueUnlockMode: true, clueUnlockAfterSeconds: true, clueRequestCost: true },
  });

  let level = assignment.clueLevel;
  if (game && game.clueUnlockMode !== "REQUEST") {
    const elapsed = (Date.now() - assignment.clueUnlockedAt.getTime()) / 1000;
    const earned = Math.floor(elapsed / Math.max(game.clueUnlockAfterSeconds, 1));
    level = Math.min(assignment.clueLevel + earned, assignment.checkpoint.clues.length);
  }

  const clue =
    assignment.checkpoint.clues.find((c) => c.level === level) ??
    assignment.checkpoint.clues[0] ??
    null;

  return {
    assignment,
    checkpoint: assignment.checkpoint,
    clue,
    level,
    maxLevel: assignment.checkpoint.clues.length,
    canRequestMore: level < assignment.checkpoint.clues.length,
    requestCost: game?.clueUnlockMode === "TIME" ? 0 : (game?.clueRequestCost ?? 0),
    expiresAt: assignment.expiresAt,
    estimatedTravelTime: assignment.estimatedTravelTime,
  };
}
