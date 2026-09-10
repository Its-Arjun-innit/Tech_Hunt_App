"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { GameStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/auth/admin";
import { GAME_COOKIE, requireCurrentGame } from "@/lib/game-engine/current-game";
import { ROUTING_CONFIG } from "@/lib/routing/config";

export type ActionResult = { ok: boolean; message: string };

export async function createGame(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Give the game a name." };

  const game = await prisma.game.create({ data: { name } });
  (await cookies()).set(GAME_COOKIE, game.id, { path: "/" });

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "GAME_CREATED",
    entity: "Game",
    entityId: game.id,
  });
  revalidatePath("/admin");
  return { ok: true, message: `Created ${name}.` };
}

export async function selectGame(gameId: string) {
  await requireAdmin();
  (await cookies()).set(GAME_COOKIE, gameId, { path: "/" });
  revalidatePath("/admin");
}

/**
 * Ending a game freezes scanning and scoring, cancels every live reservation
 * and writes the final ranking onto each team.
 */
export async function setGameStatus(status: GameStatus): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const data: Record<string, unknown> = { status };
  if (status === GameStatus.ACTIVE) {
    if (!game.startsAt) data.startsAt = new Date();
    // Reopening after an end must lift the locks that ending applied.
    if (game.status === GameStatus.ENDED) {
      data.scansLocked = false;
      data.scoringFrozen = false;
      data.endsAt = null;
    }
  }
  if (status === GameStatus.ENDED) {
    data.endsAt = game.endsAt ?? new Date();
    data.scansLocked = true;
    data.scoringFrozen = true;
  }

  await prisma.$transaction(async (tx) => {
    await tx.game.update({ where: { id: game.id }, data });

    if (status === GameStatus.ACTIVE && game.status === GameStatus.ENDED) {
      await tx.team.updateMany({
        where: { gameId: game.id, status: "FINISHED" },
        data: { status: "ACTIVE", finalRank: null },
      });
    }

    if (status === GameStatus.ENDED) {
      await tx.routingAssignment.updateMany({
        where: { status: "ACTIVE", team: { gameId: game.id } },
        data: { status: "CANCELLED" },
      });

      // Freeze the final order using the same tie-break as the leaderboard.
      const teams = await tx.team.findMany({
        where: { gameId: game.id },
        select: { id: true, score: true },
      });
      const counts = await tx.scanEvent.groupBy({
        by: ["teamId"],
        where: { team: { gameId: game.id }, result: "SUCCESS" },
        _count: { _all: true },
      });
      const scans = new Map(counts.map((c) => [c.teamId, c._count._all]));

      const ranked = teams.sort(
        (a, b) => b.score - a.score || (scans.get(b.id) ?? 0) - (scans.get(a.id) ?? 0),
      );
      for (let i = 0; i < ranked.length; i++) {
        await tx.team.update({
          where: { id: ranked[i].id },
          data: { finalRank: i + 1, status: "FINISHED" },
        });
      }
    }

    await tx.gameEvent.create({
      data: { gameId: game.id, type: "GAME_STATUS", message: `Game ${status.toLowerCase()}` },
    });
  });

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: `GAME_${status}`,
    entity: "Game",
    entityId: game.id,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: `Game ${status.toLowerCase()}.` };
}

const settingsSchema = z.object({
  name: z.string().trim().min(1),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  scoringFrozen: z.boolean(),
  scansLocked: z.boolean(),
  enforceRouting: z.boolean(),
  leaderboardDelaySeconds: z.coerce.number().int().min(0).max(3600),
  clueUnlockMode: z.enum(["TIME", "REQUEST", "BOTH"]),
  clueUnlockAfterSeconds: z.coerce.number().int().min(10).max(7200),
  clueRequestCost: z.coerce.number().int().min(0).max(1000),
});

export async function updateGameSettings(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    scoringFrozen: formData.get("scoringFrozen") === "on",
    scansLocked: formData.get("scansLocked") === "on",
    enforceRouting: formData.get("enforceRouting") === "on",
    leaderboardDelaySeconds: formData.get("leaderboardDelaySeconds"),
    clueUnlockMode: formData.get("clueUnlockMode"),
    clueUnlockAfterSeconds: formData.get("clueUnlockAfterSeconds"),
    clueRequestCost: formData.get("clueRequestCost"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values." };
  }

  const { startsAt, endsAt, ...rest } = parsed.data;
  await prisma.game.update({
    where: { id: game.id },
    data: {
      ...rest,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "GAME_SETTINGS_UPDATED",
    entity: "Game",
    entityId: game.id,
    meta: rest,
  });

  revalidatePath("/admin/game");
  return { ok: true, message: "Settings saved." };
}

/** Routing weights live in one object so the engine never needs editing. */
export async function updateRoutingConfig(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const config: Record<string, number> = {};
  for (const key of Object.keys(ROUTING_CONFIG)) {
    const raw = formData.get(key);
    const value = Number(raw);
    if (raw !== null && raw !== "" && Number.isFinite(value)) config[key] = value;
  }

  await prisma.game.update({ where: { id: game.id }, data: { routingConfig: config } });
  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "ROUTING_CONFIG_UPDATED",
    entity: "Game",
    entityId: game.id,
    meta: config,
  });

  revalidatePath("/admin/game");
  return { ok: true, message: "Routing weights saved." };
}
