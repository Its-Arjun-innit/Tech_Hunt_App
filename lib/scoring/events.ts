import type { Prisma } from "@prisma/client";
import { type ScoreEventType } from "@prisma/client";

/**
 * The single source of truth for scoring a team.
 *
 * Creates a ScoreEvent and updates the cached Team.score in one shot.
 * Every scoring site in the codebase should call this instead of
 * manually doing both operations.
 */
export async function recordScore(
  tx: Prisma.TransactionClient,
  args: {
    teamId: string;
    points: number;
    type: ScoreEventType;
    refId: string;
    note: string;
  },
): Promise<void> {
  if (args.points === 0) return;

  await tx.scoreEvent.create({
    data: {
      teamId: args.teamId,
      type: args.type,
      points: args.points,
      refId: args.refId,
      note: args.note,
    },
  });

  await tx.team.update({
    where: { id: args.teamId },
    data: {
      score: args.points > 0
        ? { increment: args.points }
        : { decrement: Math.abs(args.points) },
    },
  });
}
