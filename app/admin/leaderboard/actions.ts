"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/auth/admin";

export type ActionResult = { ok: boolean; message: string };

const schema = z.object({
  teamId: z.string().min(1),
  points: z.coerce
    .number()
    .int("Use a whole number")
    .refine((n) => n !== 0, "Enter a non-zero adjustment")
    .refine((n) => Math.abs(n) <= 10000, "That adjustment is too large"),
  reason: z.string().trim().min(3, "Give a reason; it goes in the audit log"),
});

/**
 * Manual score correction.
 *
 * Written as a ScoreEvent rather than by editing Team.score, so the ledger
 * stays the source of truth and the adjustment shows up in the team's own
 * activity feed. A reason is required because this is the one place an
 * organizer can change a result by hand, and disputes get resolved from the
 * audit log.
 */
export async function adjustScore(input: {
  teamId: string;
  points: number;
  reason: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values." };
  }
  const { teamId, points, reason } = parsed.data;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, gameId: true, score: true },
  });
  if (!team) return { ok: false, message: "Team not found." };

  await prisma.$transaction(async (tx) => {
    await tx.scoreEvent.create({
      data: {
        teamId,
        type: "ADMIN_ADJUSTMENT",
        points,
        note: reason,
      },
    });
    await tx.team.update({
      where: { id: teamId },
      data: { score: { increment: points } },
    });
    await tx.gameEvent.create({
      data: {
        gameId: team.gameId,
        teamId,
        type: "SCORE_ADJUSTED",
        message: `${team.name} adjusted by ${points > 0 ? "+" : ""}${points}: ${reason}`,
      },
    });
  });

  await auditLog({
    gameId: team.gameId,
    actorId: admin.id,
    actorName: admin.email,
    action: "SCORE_ADJUSTED",
    entity: "Team",
    entityId: teamId,
    meta: { points, reason, previousScore: team.score },
  });

  revalidatePath("/admin/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");

  return {
    ok: true,
    message: `${team.name} adjusted by ${points > 0 ? "+" : ""}${points}.`,
  };
}
