"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/auth/admin";
import { requireCurrentGame } from "@/lib/game-engine/current-game";

export type ActionResult = { ok: boolean; message: string };

const schema = z.object({
  message: z.string().trim().min(1, "Write a message first."),
  audience: z.enum(["ALL_TEAMS", "SELECTED_TEAMS", "VOLUNTEERS", "ADMINS"]),
  teamIds: z.array(z.string()),
  /** Local datetime string from the form, or empty to send immediately. */
  scheduledFor: z.string().optional(),
});

export async function sendAnnouncement(input: {
  message: string;
  audience: "ALL_TEAMS" | "SELECTED_TEAMS" | "VOLUNTEERS" | "ADMINS";
  teamIds: string[];
  scheduledFor?: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the message." };
  }
  const { message, audience, teamIds, scheduledFor } = parsed.data;

  if (audience === "SELECTED_TEAMS" && teamIds.length === 0) {
    return { ok: false, message: "Pick at least one team, or choose all teams." };
  }

  const when = scheduledFor ? new Date(scheduledFor) : null;
  if (when && Number.isNaN(when.getTime())) {
    return { ok: false, message: "That schedule time is not valid." };
  }

  await prisma.announcement.create({
    data: {
      gameId: game.id,
      message,
      audience,
      // Team ids are only meaningful for a targeted send.
      teamIds: audience === "SELECTED_TEAMS" ? teamIds : [],
      scheduledFor: when,
    },
  });

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "ANNOUNCEMENT_SENT",
    meta: { audience, teams: teamIds.length, scheduled: when?.toISOString() ?? null },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  revalidatePath("/volunteer");

  const audienceWord =
    audience === "ALL_TEAMS"
      ? "all teams"
      : audience === "SELECTED_TEAMS"
        ? `${teamIds.length} team${teamIds.length === 1 ? "" : "s"}`
        : audience.toLowerCase();

  return {
    ok: true,
    message: when
      ? `Scheduled for ${when.toLocaleString()} to ${audienceWord}.`
      : `Sent to ${audienceWord}.`,
  };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.announcement.delete({ where: { id } });
  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "ANNOUNCEMENT_DELETED",
    entity: "Announcement",
    entityId: id,
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return { ok: true, message: "Announcement removed." };
}
