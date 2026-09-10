import { AttemptStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { gradeSubmission } from "@/lib/challenges/grade";
import { advanceTeam, type NextObjective } from "./advance";

export type ChallengeOutcome =
  | { ok: true; status: "SUCCESS"; pointsAwarded: number; next: NextObjective | null }
  | { ok: true; status: "PENDING"; message: string }
  | { ok: true; status: "STAGE_CLEARED"; nextStage: number }
  | { ok: false; message: string; attemptsLeft: number };

/**
 * Grades a team submission and, on success, releases the team to its next
 * destination. Scoring and routing happen in the same transaction.
 */
export async function submitChallenge(args: {
  teamId: string;
  gameId: string;
  challengeId: string;
  submission: unknown;
  random?: () => number;
}): Promise<ChallengeOutcome> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${args.teamId} FOR UPDATE`;

    const [game, challenge, attempts] = await Promise.all([
      tx.game.findUnique({ where: { id: args.gameId } }),
      tx.challenge.findUnique({ where: { id: args.challengeId } }),
      tx.challengeAttempt.findMany({
        where: { teamId: args.teamId, challengeId: args.challengeId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!game || game.status !== "ACTIVE") {
      return { ok: false as const, message: "The game is not running.", attemptsLeft: 0 };
    }
    if (!challenge || !challenge.active) {
      return { ok: false as const, message: "Challenge unavailable.", attemptsLeft: 0 };
    }
    if (attempts.some((a) => a.status === AttemptStatus.SUCCESS)) {
      return { ok: false as const, message: "Already completed.", attemptsLeft: 0 };
    }
    const pending = attempts.find((a) => a.status === AttemptStatus.PENDING);
    if (pending) {
      return {
        ok: true as const,
        status: "PENDING" as const,
        message: "A volunteer is reviewing your submission.",
      };
    }

    const failed = attempts.filter((a) => a.status === AttemptStatus.FAILED).length;
    if (failed >= challenge.maxAttempts) {
      return { ok: false as const, message: "No attempts remaining.", attemptsLeft: 0 };
    }

    // Stage progress is the highest stage the team has cleared so far.
    const stageIndex = attempts.reduce((max, a) => Math.max(max, a.stageIndex), 0);

    const result = gradeSubmission({
      type: challenge.type,
      config: challenge.config,
      submission: args.submission,
      stageIndex,
    });

    if (result.status === "PENDING") {
      await tx.challengeAttempt.create({
        data: {
          teamId: args.teamId,
          challengeId: challenge.id,
          status: AttemptStatus.PENDING,
          payload: args.submission as never,
          stageIndex,
        },
      });
      return {
        ok: true as const,
        status: "PENDING" as const,
        message: "Submitted. A volunteer will verify it shortly.",
      };
    }

    if (result.status === "FAILED") {
      await tx.challengeAttempt.create({
        data: {
          teamId: args.teamId,
          challengeId: challenge.id,
          status: AttemptStatus.FAILED,
          payload: args.submission as never,
          stageIndex,
        },
      });
      if (challenge.penaltyPoints > 0 && !game.scoringFrozen) {
        await tx.scoreEvent.create({
          data: {
            teamId: args.teamId,
            type: "PENALTY",
            points: -challenge.penaltyPoints,
            refId: challenge.id,
            note: `Failed attempt: ${challenge.title}`,
          },
        });
        await tx.team.update({
          where: { id: args.teamId },
          data: { score: { decrement: challenge.penaltyPoints } },
        });
      }
      return {
        ok: false as const,
        message: result.message,
        attemptsLeft: Math.max(0, challenge.maxAttempts - failed - 1),
      };
    }

    if (result.status === "STAGE_CLEARED") {
      await tx.challengeAttempt.create({
        data: {
          teamId: args.teamId,
          challengeId: challenge.id,
          status: AttemptStatus.FAILED, // not finished yet; only stage progress
          payload: args.submission as never,
          stageIndex: result.nextStage,
          note: "stage cleared",
        },
      });
      return { ok: true as const, status: "STAGE_CLEARED" as const, nextStage: result.nextStage };
    }

    const attempt = await tx.challengeAttempt.create({
      data: {
        teamId: args.teamId,
        challengeId: challenge.id,
        status: AttemptStatus.SUCCESS,
        payload: args.submission as never,
        stageIndex,
      },
    });

    const next = await awardAndAdvance(tx, {
      teamId: args.teamId,
      gameId: args.gameId,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      attemptId: attempt.id,
      points: game.scoringFrozen ? 0 : challenge.points,
      checkpointId: challenge.checkpointId,
      routingConfig: game.routingConfig,
      random: args.random,
    });

    return {
      ok: true as const,
      status: "SUCCESS" as const,
      pointsAwarded: game.scoringFrozen ? 0 : challenge.points,
      next,
    };
  });
}

/** Shared by player submissions and volunteer verification. */
export async function awardAndAdvance(
  tx: Prisma.TransactionClient,
  args: {
    teamId: string;
    gameId: string;
    challengeId: string;
    challengeTitle: string;
    attemptId: string;
    points: number;
    checkpointId: string;
    routingConfig: unknown;
    random?: () => number;
  },
) {
  if (args.points > 0) {
    await tx.scoreEvent.create({
      data: {
        teamId: args.teamId,
        type: "CHALLENGE",
        points: args.points,
        refId: args.challengeId,
        note: `Challenge: ${args.challengeTitle}`,
      },
    });
    await tx.challengeAttempt.update({
      where: { id: args.attemptId },
      data: { pointsAwarded: args.points },
    });
  }

  const team = await tx.team.update({
    where: { id: args.teamId },
    data: { score: { increment: args.points } },
  });

  await tx.gameEvent.create({
    data: {
      gameId: args.gameId,
      teamId: args.teamId,
      type: "CHALLENGE_COMPLETED",
      message: `${team.name} completed ${args.challengeTitle} (+${args.points})`,
    },
  });

  return advanceTeam(tx, {
    gameId: args.gameId,
    teamId: args.teamId,
    fromCheckpointId: args.checkpointId,
    routingConfig: args.routingConfig,
    random: args.random,
  });
}
