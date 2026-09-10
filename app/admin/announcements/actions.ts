"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/auth/admin";
import { requireCurrentGame } from "@/lib/game-engine/current-game";

export type ActionResult = { ok: boolean; message: string };

/** An empty teamIds list means every team sees it. */
export async function sendAnnouncement(
  message: string,
  teamIds: string[],
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const text = message.trim();
  if (!text) return { ok: false, message: "Write a message first." };

  await prisma.announcement.create({
    data: { gameId: game.id, message: text, teamIds },
  });

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "ANNOUNCEMENT_SENT",
    meta: { message: text, teams: teamIds.length || "all" },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: teamIds.length === 0 ? "Sent to all teams." : `Sent to ${teamIds.length} team(s).`,
  };
}
