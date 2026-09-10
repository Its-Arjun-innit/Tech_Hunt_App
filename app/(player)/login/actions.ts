"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createPlayerSession, destroyPlayerSession } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/admin";

const loginSchema = z.object({
  teamName: z.string().trim().min(1, "Team name is required"),
  memberCode: z.string().trim().min(1, "Member code is required"),
  pin: z.string().trim().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export type LoginState = { error?: string };

export async function playerLogin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    teamName: formData.get("teamName"),
    memberCode: formData.get("memberCode"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const { teamName, memberCode, pin } = parsed.data;

  const player = await prisma.player.findFirst({
    where: {
      memberCode: { equals: memberCode, mode: "insensitive" },
      team: { name: { equals: teamName, mode: "insensitive" } },
    },
    include: { team: { include: { game: true } } },
  });

  // One generic message: never reveal which of the three fields was wrong.
  const generic = { error: "Team name, member code or PIN is incorrect." };
  if (!player) {
    await bcrypt.compare(pin, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return generic;
  }
  if (!(await bcrypt.compare(pin, player.pinHash))) return generic;

  if (player.status !== "ACTIVE") {
    return { error: "Your account is disabled. Contact an organizer." };
  }
  if (player.team.status === "DISABLED") {
    return { error: "Your team is disabled. Contact an organizer." };
  }

  await createPlayerSession(player.id);
  await auditLog({
    gameId: player.team.gameId,
    actorType: "PLAYER",
    actorId: player.id,
    actorName: `${player.team.name} / ${player.name}`,
    action: "PLAYER_LOGIN",
    entity: "Player",
    entityId: player.id,
  });

  redirect("/dashboard");
}

export async function playerLogout() {
  await destroyPlayerSession();
  redirect("/login");
}
