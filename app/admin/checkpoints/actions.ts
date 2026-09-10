"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ChallengeType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/auth/admin";
import { requireCurrentGame } from "@/lib/game-engine/current-game";
import { generateQrToken } from "@/lib/qr/token";
import { parseChallengeConfig } from "@/lib/challenges/schemas";

export type ActionResult = { ok: boolean; message: string; id?: string };

const checkpointSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  points: z.coerce.number().int().min(0).max(10000),
  capacity: z.coerce.number().int().min(1).max(100),
  difficulty: z.coerce.number().int().min(1).max(5),
  routeGroup: z.string().trim().optional(),
  active: z.boolean(),
});

function readCheckpointForm(formData: FormData) {
  return checkpointSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    points: formData.get("points"),
    capacity: formData.get("capacity"),
    difficulty: formData.get("difficulty"),
    routeGroup: formData.get("routeGroup") || undefined,
    active: formData.get("active") === "on",
  });
}

export async function createCheckpoint(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const game = await requireCurrentGame();

  const parsed = readCheckpointForm(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values." };
  }

  const checkpoint = await prisma.checkpoint.create({
    data: { ...parsed.data, gameId: game.id, qrToken: generateQrToken() },
  });

  await auditLog({
    gameId: game.id,
    actorId: admin.id,
    actorName: admin.email,
    action: "CHECKPOINT_CREATED",
    entity: "Checkpoint",
    entityId: checkpoint.id,
    meta: { name: checkpoint.name },
  });

  revalidatePath("/admin/checkpoints");
  return { ok: true, message: `Created ${checkpoint.name}.`, id: checkpoint.id };
}

export async function updateCheckpoint(
  checkpointId: string,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = readCheckpointForm(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values." };
  }

  await prisma.checkpoint.update({ where: { id: checkpointId }, data: parsed.data });
  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "CHECKPOINT_UPDATED",
    entity: "Checkpoint",
    entityId: checkpointId,
    meta: parsed.data,
  });

  revalidatePath("/admin/checkpoints");
  revalidatePath(`/admin/checkpoints/${checkpointId}`);
  return { ok: true, message: "Checkpoint saved." };
}

/** Move a marker on the admin map without opening the full editor. */
export async function moveCheckpoint(
  checkpointId: string,
  latitude: number,
  longitude: number,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.checkpoint.update({
    where: { id: checkpointId },
    data: { latitude, longitude },
  });
  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "CHECKPOINT_MOVED",
    entity: "Checkpoint",
    entityId: checkpointId,
    meta: { latitude, longitude },
  });

  revalidatePath("/admin/map");
  revalidatePath("/admin/checkpoints");
  return { ok: true, message: "Location updated." };
}

export async function setCheckpointActive(
  checkpointId: string,
  active: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.checkpoint.update({ where: { id: checkpointId }, data: { active } });

  // Teams heading to a disabled checkpoint must be released.
  if (!active) {
    await prisma.routingAssignment.updateMany({
      where: { checkpointId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
  }

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: active ? "CHECKPOINT_ENABLED" : "CHECKPOINT_DISABLED",
    entity: "Checkpoint",
    entityId: checkpointId,
  });

  revalidatePath("/admin/checkpoints");
  revalidatePath("/admin/routing");
  return {
    ok: true,
    message: active
      ? "Checkpoint enabled."
      : "Checkpoint disabled. Teams routed there need rerouting.",
  };
}

export async function deleteCheckpoint(checkpointId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const cp = await prisma.checkpoint.findUnique({ where: { id: checkpointId } });
  if (!cp) return { ok: false, message: "Checkpoint not found." };

  await prisma.checkpoint.delete({ where: { id: checkpointId } });
  await auditLog({
    gameId: cp.gameId,
    actorId: admin.id,
    actorName: admin.email,
    action: "CHECKPOINT_DELETED",
    entity: "Checkpoint",
    entityId: checkpointId,
    meta: { name: cp.name },
  });

  revalidatePath("/admin/checkpoints");
  return { ok: true, message: `Deleted ${cp.name}.` };
}

/** A new token retires the old poster immediately. */
export async function regenerateQr(checkpointId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const token = generateQrToken();
  await prisma.checkpoint.update({ where: { id: checkpointId }, data: { qrToken: token } });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "CHECKPOINT_QR_REGENERATED",
    entity: "Checkpoint",
    entityId: checkpointId,
  });

  revalidatePath("/admin/checkpoints");
  revalidatePath("/admin/qr");
  return { ok: true, message: "New QR code issued. Reprint the poster." };
}

/** Replaces the allowed next checkpoints for this checkpoint. */
export async function setRoutes(
  checkpointId: string,
  targetIds: string[],
): Promise<ActionResult> {
  const admin = await requireAdmin();

  await prisma.$transaction([
    prisma.checkpointRoute.deleteMany({ where: { fromId: checkpointId } }),
    prisma.checkpointRoute.createMany({
      data: targetIds
        .filter((id) => id !== checkpointId)
        .map((toId) => ({ fromId: checkpointId, toId })),
      skipDuplicates: true,
    }),
  ]);

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "CHECKPOINT_ROUTES_UPDATED",
    entity: "Checkpoint",
    entityId: checkpointId,
    meta: { count: targetIds.length },
  });

  revalidatePath(`/admin/checkpoints/${checkpointId}`);
  return { ok: true, message: `${targetIds.length} destination(s) saved.` };
}

/** Clue levels for reaching this checkpoint, level 1 being the most cryptic. */
export async function setClues(
  checkpointId: string,
  clues: string[],
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const cleaned = clues.map((c) => c.trim()).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    // Assignments point at clue rows, so detach before replacing them.
    await tx.routingAssignment.updateMany({
      where: { clue: { checkpointId } },
      data: { clueId: null },
    });
    await tx.clue.deleteMany({ where: { checkpointId } });
    if (cleaned.length > 0) {
      await tx.clue.createMany({
        data: cleaned.map((text, i) => ({ checkpointId, level: i + 1, text })),
      });
    }
  });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "CHECKPOINT_CLUES_UPDATED",
    entity: "Checkpoint",
    entityId: checkpointId,
    meta: { levels: cleaned.length },
  });

  revalidatePath(`/admin/checkpoints/${checkpointId}`);
  return { ok: true, message: `${cleaned.length} clue level(s) saved.` };
}

const challengeSchema = z.object({
  type: z.nativeEnum(ChallengeType),
  title: z.string().trim().min(1, "Title is required"),
  prompt: z.string().trim().min(1, "Prompt is required"),
  points: z.coerce.number().int().min(0).max(10000),
  maxAttempts: z.coerce.number().int().min(1).max(20),
  penaltyPoints: z.coerce.number().int().min(0).max(1000),
  timeLimitSeconds: z.coerce.number().int().min(0).max(86400).optional(),
  active: z.boolean(),
});

export async function saveChallenge(
  checkpointId: string,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = challengeSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    prompt: formData.get("prompt"),
    points: formData.get("points"),
    maxAttempts: formData.get("maxAttempts"),
    penaltyPoints: formData.get("penaltyPoints"),
    timeLimitSeconds: formData.get("timeLimitSeconds") || undefined,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values." };
  }

  // The config box holds type-specific JSON; validate it before storing.
  let config: unknown = {};
  const rawConfig = String(formData.get("config") ?? "").trim();
  if (rawConfig) {
    try {
      config = JSON.parse(rawConfig);
    } catch {
      return { ok: false, message: "Challenge configuration is not valid JSON." };
    }
  }

  const validated = parseChallengeConfig(parsed.data.type, config);
  if (!validated.success) {
    return {
      ok: false,
      message: `Configuration does not match a ${parsed.data.type} challenge: ${validated.error.issues[0]?.message}`,
    };
  }

  const { timeLimitSeconds, ...rest } = parsed.data;
  const data = {
    ...rest,
    timeLimitSeconds: timeLimitSeconds && timeLimitSeconds > 0 ? timeLimitSeconds : null,
    config: config as never,
  };

  await prisma.challenge.upsert({
    where: { checkpointId },
    create: { ...data, checkpointId },
    update: data,
  });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "CHALLENGE_SAVED",
    entity: "Checkpoint",
    entityId: checkpointId,
    meta: { type: parsed.data.type },
  });

  revalidatePath(`/admin/checkpoints/${checkpointId}`);
  revalidatePath("/admin/challenges");
  return { ok: true, message: "Challenge saved." };
}

export async function deleteChallenge(checkpointId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.challenge.deleteMany({ where: { checkpointId } });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "CHALLENGE_DELETED",
    entity: "Checkpoint",
    entityId: checkpointId,
  });

  revalidatePath(`/admin/checkpoints/${checkpointId}`);
  revalidatePath("/admin/challenges");
  return { ok: true, message: "Challenge removed." };
}
