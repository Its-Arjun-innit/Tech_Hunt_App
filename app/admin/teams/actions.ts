"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/auth/admin";
import { requireCurrentGame } from "@/lib/game-engine/current-game";
import { generatePin, generateTeamCode } from "@/lib/qr/token";
import { parseRoster } from "@/lib/validation/csv";
import { advanceTeam } from "@/lib/game-engine/advance";

export type ActionResult = { ok: boolean; message: string };

const PIN_ROUNDS = 10;

export async function createTeam(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Team name is required." };

  const existing = await prisma.team.findFirst({ where: { gameId: game.id, name } });
  if (existing) return { ok: false, message: `${name} already exists.` };

  const team = await prisma.team.create({
    data: { gameId: game.id, name, code: generateTeamCode() },
  });
  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "TEAM_CREATED",
    entity: "Team",
    entityId: team.id,
    meta: { name },
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: `Created ${name}.` };
}

export async function renameTeam(teamId: string, name: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!name.trim()) return { ok: false, message: "Team name is required." };

  await prisma.team.update({ where: { id: teamId }, data: { name: name.trim() } });
  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "TEAM_RENAMED",
    entity: "Team",
    entityId: teamId,
    meta: { name },
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: "Team renamed." };
}

export async function setTeamStatus(
  teamId: string,
  status: "ACTIVE" | "DISABLED",
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.team.update({ where: { id: teamId }, data: { status } });
  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: `TEAM_${status}`,
    entity: "Team",
    entityId: teamId,
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: `Team ${status.toLowerCase()}.` };
}

export async function deleteTeam(teamId: string): Promise<ActionResult> {
  const admin = await requireAdmin("SUPER_ADMIN");
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { ok: false, message: "Team not found." };

  await prisma.team.delete({ where: { id: teamId } });
  await auditLog({
    gameId: team.gameId,
    actorId: admin.id,
    actorName: admin.email,
    action: "TEAM_DELETED",
    entity: "Team",
    entityId: teamId,
    meta: { name: team.name },
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: `Deleted ${team.name}.` };
}

const playerSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().trim().min(1, "Player name is required"),
  memberCode: z.string().trim().min(1, "Member code is required"),
});

/** Creates a player and returns the generated PIN once, for the print sheet. */
export async function addPlayer(formData: FormData): Promise<ActionResult & { pin?: string }> {
  const admin = await requireAdmin();
  const parsed = playerSchema.safeParse({
    teamId: formData.get("teamId"),
    name: formData.get("name"),
    memberCode: formData.get("memberCode"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const clash = await prisma.player.findFirst({
    where: { teamId: parsed.data.teamId, memberCode: parsed.data.memberCode },
  });
  if (clash) return { ok: false, message: "That member code is already used in this team." };

  const pin = generatePin();
  const player = await prisma.player.create({
    data: {
      teamId: parsed.data.teamId,
      name: parsed.data.name,
      memberCode: parsed.data.memberCode.toUpperCase(),
      pinHash: await bcrypt.hash(pin, PIN_ROUNDS),
    },
  });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "PLAYER_CREATED",
    entity: "Player",
    entityId: player.id,
    meta: { name: parsed.data.name },
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: `Added ${parsed.data.name}. PIN ${pin}`, pin };
}

export async function resetPin(playerId: string): Promise<ActionResult & { pin?: string }> {
  const admin = await requireAdmin();
  const pin = generatePin();

  await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { pinHash: bcrypt.hashSync(pin, PIN_ROUNDS) },
    }),
    // A new PIN invalidates the old device.
    prisma.session.deleteMany({ where: { playerId } }),
  ]);

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "PLAYER_PIN_RESET",
    entity: "Player",
    entityId: playerId,
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: `New PIN: ${pin}`, pin };
}

export async function setPlayerStatus(
  playerId: string,
  status: "ACTIVE" | "DISABLED",
): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.player.update({ where: { id: playerId }, data: { status } });
  if (status === "DISABLED") {
    await prisma.session.deleteMany({ where: { playerId } });
  }

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: `PLAYER_${status}`,
    entity: "Player",
    entityId: playerId,
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: `Player ${status.toLowerCase()}.` };
}

/** Kills the player session so the next request bounces them to login. */
export async function forceLogout(playerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const { count } = await prisma.session.deleteMany({ where: { playerId } });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "PLAYER_FORCE_LOGOUT",
    entity: "Player",
    entityId: playerId,
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: count > 0 ? "Player signed out." : "Player was not signed in." };
}

export async function deletePlayer(playerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.player.delete({ where: { id: playerId } });
  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "PLAYER_DELETED",
    entity: "Player",
    entityId: playerId,
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: "Player removed." };
}

export type ImportedCredential = {
  teamName: string;
  memberName: string;
  memberCode: string;
  pin: string;
};

/**
 * Bulk roster import. Teams are created as needed, PINs are generated here and
 * returned once so the organizer can print them; they are never stored in clear.
 */
export async function importRoster(
  csv: string,
): Promise<ActionResult & { credentials?: ImportedCredential[]; errors?: string[] }> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const { rows, errors } = parseRoster(csv);
  if (rows.length === 0) {
    return { ok: false, message: "Nothing to import.", errors };
  }

  const credentials: ImportedCredential[] = [];
  const problems = [...errors];

  for (const row of rows) {
    const team =
      (await prisma.team.findFirst({ where: { gameId: game.id, name: row.teamName } })) ??
      (await prisma.team.create({
        data: { gameId: game.id, name: row.teamName, code: generateTeamCode() },
      }));

    // Blank code: initials of the team name plus a running number, e.g. TE001.
    const initials =
      row.teamName
        .split(/\s+/)
        .map((w) => w.replace(/\W/g, "").charAt(0))
        .join("")
        .slice(0, 3) || "P";
    const memberCode = (
      row.memberCode ||
      `${initials}${String(
        (await prisma.player.count({ where: { teamId: team.id } })) + 1,
      ).padStart(3, "0")}`
    ).toUpperCase();

    const clash = await prisma.player.findFirst({ where: { teamId: team.id, memberCode } });
    if (clash) {
      problems.push(`${row.teamName} / ${memberCode}: already exists, skipped.`);
      continue;
    }

    const pin = generatePin();
    await prisma.player.create({
      data: {
        teamId: team.id,
        name: row.memberName,
        memberCode,
        pinHash: await bcrypt.hash(pin, PIN_ROUNDS),
      },
    });

    credentials.push({
      teamName: team.name,
      memberName: row.memberName,
      memberCode,
      pin,
    });
  }

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "ROSTER_IMPORTED",
    meta: { imported: credentials.length, skipped: problems.length },
  });

  revalidatePath("/admin/teams");
  return {
    ok: credentials.length > 0,
    message: `Imported ${credentials.length} player(s).`,
    credentials,
    errors: problems,
  };
}

/** Manually send a team to a specific checkpoint, overriding the engine. */
export async function redirectTeam(
  teamId: string,
  checkpointId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const [team, checkpoint] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.checkpoint.findUnique({
      where: { id: checkpointId },
      include: { clues: { orderBy: { level: "asc" } } },
    }),
  ]);
  if (!team || !checkpoint) return { ok: false, message: "Team or checkpoint not found." };

  const cfgTtl = 1800;
  await prisma.$transaction(async (tx) => {
    await tx.routingAssignment.updateMany({
      where: { teamId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    await tx.routingAssignment.create({
      data: {
        teamId,
        checkpointId,
        fromCheckpointId: team.currentCheckpointId,
        reason: `Manually redirected by ${admin.email}.`,
        clueId: checkpoint.clues[0]?.id ?? null,
        expiresAt: new Date(Date.now() + cfgTtl * 1000),
      },
    });
    await tx.gameEvent.create({
      data: {
        gameId: game.id,
        teamId,
        type: "TEAM_REDIRECTED",
        message: `${team.name} was redirected to ${checkpoint.name}`,
      },
    });
  });

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "TEAM_REDIRECTED",
    entity: "Team",
    entityId: teamId,
    meta: { checkpoint: checkpoint.name },
  });

  revalidatePath("/admin/routing");
  revalidatePath("/dashboard");
  return { ok: true, message: `${team.name} sent to ${checkpoint.name}.` };
}

/** Ask the engine for a fresh destination, e.g. after disabling a checkpoint. */
export async function rerouteTeam(teamId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { ok: false, message: "Team not found." };

  const next = await prisma.$transaction((tx) =>
    advanceTeam(tx, {
      gameId: game.id,
      teamId,
      fromCheckpointId: team.currentCheckpointId,
      routingConfig: game.routingConfig,
    }),
  );

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "TEAM_REROUTED",
    entity: "Team",
    entityId: teamId,
    meta: { checkpoint: next?.checkpointName ?? null },
  });

  revalidatePath("/admin/routing");
  revalidatePath("/dashboard");
  return next
    ? { ok: true, message: `${team.name} sent to ${next.checkpointName}.` }
    : { ok: false, message: "No checkpoint is available for this team." };
}

/**
 * Issues fresh PINs for a whole game and returns them once for printing.
 * The stored hashes are one-way, so this is the only way to reproduce a lost
 * credential sheet.
 */
export async function regenerateAllPins(): Promise<
  ActionResult & { credentials?: ImportedCredential[] }
> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const players = await prisma.player.findMany({
    where: { team: { gameId: game.id } },
    include: { team: { select: { name: true } } },
    orderBy: [{ team: { name: "asc" } }, { memberCode: "asc" }],
  });

  const credentials: ImportedCredential[] = [];
  for (const p of players) {
    const pin = generatePin();
    await prisma.player.update({
      where: { id: p.id },
      data: { pinHash: await bcrypt.hash(pin, PIN_ROUNDS) },
    });
    credentials.push({
      teamName: p.team.name,
      memberName: p.name,
      memberCode: p.memberCode,
      pin,
    });
  }

  // Everyone must sign in again with their new PIN.
  await prisma.session.deleteMany({ where: { player: { team: { gameId: game.id } } } });

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "ALL_PINS_REGENERATED",
    meta: { count: credentials.length },
  });

  revalidatePath("/admin/teams");
  return { ok: true, message: `Issued ${credentials.length} new PIN(s).`, credentials };
}
