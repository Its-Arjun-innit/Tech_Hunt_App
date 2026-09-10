"use server";

import { revalidatePath } from "next/cache";
import { AttemptStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/auth/admin";
import { awardAndAdvance } from "@/lib/game-engine/complete-challenge";

export type ActionResult = { ok: boolean; message: string };

/**
 * A volunteer signs off a physical or photo challenge. Points and the next
 * clue are issued in one transaction, exactly as for an auto-graded challenge.
 */
export async function verifyAttempt(
  attemptId: string,
  approve: boolean,
  note?: string,
): Promise<ActionResult> {
  const volunteer = await requireAdmin("VOLUNTEER");

  const attempt = await prisma.challengeAttempt.findUnique({
    where: { id: attemptId },
    include: {
      challenge: { include: { checkpoint: { select: { id: true, gameId: true } } } },
      team: { select: { id: true, name: true, gameId: true } },
    },
  });
  if (!attempt) return { ok: false, message: "Submission not found." };
  if (attempt.status !== AttemptStatus.PENDING) {
    return { ok: false, message: "This submission was already reviewed." };
  }

  const game = await prisma.game.findUnique({ where: { id: attempt.team.gameId } });
  if (!game) return { ok: false, message: "Game not found." };

  const points = approve && !game.scoringFrozen ? attempt.challenge.points : 0;

  await prisma.$transaction(async (tx) => {
    await tx.challengeAttempt.update({
      where: { id: attemptId },
      data: {
        status: approve ? AttemptStatus.SUCCESS : AttemptStatus.FAILED,
        verifiedById: volunteer.id,
        note: note?.trim() || null,
      },
    });

    if (approve) {
      await awardAndAdvance(tx, {
        teamId: attempt.team.id,
        gameId: attempt.team.gameId,
        challengeId: attempt.challenge.id,
        challengeTitle: attempt.challenge.title,
        attemptId,
        points,
        checkpointId: attempt.challenge.checkpoint.id,
        routingConfig: game.routingConfig,
      });
    } else {
      if (attempt.challenge.penaltyPoints > 0 && !game.scoringFrozen) {
        await tx.scoreEvent.create({
          data: {
            teamId: attempt.team.id,
            type: "PENALTY",
            points: -attempt.challenge.penaltyPoints,
            refId: attempt.challenge.id,
            note: `Rejected by volunteer: ${attempt.challenge.title}`,
          },
        });
        await tx.team.update({
          where: { id: attempt.team.id },
          data: { score: { decrement: attempt.challenge.penaltyPoints } },
        });
      }
      await tx.gameEvent.create({
        data: {
          gameId: attempt.team.gameId,
          teamId: attempt.team.id,
          type: "CHALLENGE_REJECTED",
          message: `${attempt.team.name} failed ${attempt.challenge.title}`,
        },
      });
    }
  });

  await auditLog({
    gameId: attempt.team.gameId,
    actorId: volunteer.id,
    actorName: volunteer.email,
    action: approve ? "ATTEMPT_APPROVED" : "ATTEMPT_REJECTED",
    entity: "ChallengeAttempt",
    entityId: attemptId,
    meta: { team: attempt.team.name, points },
  });

  revalidatePath("/volunteer");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: approve
      ? `Approved. ${attempt.team.name} earned ${points} points.`
      : `Marked as failed for ${attempt.team.name}.`,
  };
}

/** Volunteers report problems (broken QR, blocked route) into the audit log. */
export async function reportIssue(message: string): Promise<ActionResult> {
  const volunteer = await requireAdmin("VOLUNTEER");
  const text = message.trim();
  if (!text) return { ok: false, message: "Describe the issue first." };

  const game = await prisma.game.findFirst({ orderBy: { createdAt: "desc" } });

  await prisma.$transaction(async (tx) => {
    if (game) {
      await tx.gameEvent.create({
        data: {
          gameId: game.id,
          type: "VOLUNTEER_ISSUE",
          message: `${volunteer.name}: ${text}`,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        gameId: game?.id ?? null,
        actorType: "ADMIN",
        actorId: volunteer.id,
        actorName: volunteer.email,
        action: "VOLUNTEER_ISSUE_REPORTED",
        meta: { message: text },
      },
    });
  });

  revalidatePath("/volunteer");
  revalidatePath("/admin/audit");
  return { ok: true, message: "Reported. An organizer will see it in the audit log." };
}
