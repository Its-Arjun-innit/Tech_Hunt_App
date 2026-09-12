"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/auth/admin";

export type ActionResult = { ok: boolean; message: string; password?: string };

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  checkpointId: z.string().optional(),
});

/** A generated first password, shown once so the organizer can hand it over. */
function tempPassword() {
  const words = ["campus", "hunt", "relay", "signal", "beacon", "marker"];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createVolunteer(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    checkpointId: formData.get("checkpointId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const email = parsed.data.email.toLowerCase();
  if (await prisma.adminUser.findUnique({ where: { email } })) {
    return { ok: false, message: "An account with that email already exists." };
  }

  const password = tempPassword();
  const volunteer = await prisma.adminUser.create({
    data: {
      email,
      name: parsed.data.name,
      role: "VOLUNTEER",
      passwordHash: await bcrypt.hash(password, 10),
      checkpointId: parsed.data.checkpointId || null,
    },
  });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "VOLUNTEER_CREATED",
    entity: "AdminUser",
    entityId: volunteer.id,
    meta: { email },
  });

  revalidatePath("/admin/volunteers");
  // Returned once. It is hashed in the database and cannot be read back.
  return { ok: true, message: `Created ${parsed.data.name}.`, password };
}

export async function assignVolunteer(
  volunteerId: string,
  checkpointId: string | null,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const volunteer = await prisma.adminUser.update({
    where: { id: volunteerId },
    data: { checkpointId },
    include: { checkpoint: { select: { name: true } } },
  });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: checkpointId ? "VOLUNTEER_ASSIGNED" : "VOLUNTEER_UNASSIGNED",
    entity: "AdminUser",
    entityId: volunteerId,
    meta: { checkpoint: volunteer.checkpoint?.name ?? null },
  });

  revalidatePath("/admin/volunteers");
  revalidatePath("/admin/map");
  revalidatePath("/volunteer");
  return {
    ok: true,
    message: volunteer.checkpoint
      ? `${volunteer.name} posted at ${volunteer.checkpoint.name}.`
      : `${volunteer.name} is no longer posted anywhere.`,
  };
}

export async function setVolunteerActive(
  volunteerId: string,
  active: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const volunteer = await prisma.adminUser.update({
    where: { id: volunteerId },
    data: { active },
  });
  // Disabling should also end any live session, not just block the next login.
  if (!active) {
    await prisma.adminSession.deleteMany({ where: { adminId: volunteerId } });
  }

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: active ? "VOLUNTEER_ENABLED" : "VOLUNTEER_DISABLED",
    entity: "AdminUser",
    entityId: volunteerId,
  });

  revalidatePath("/admin/volunteers");
  return {
    ok: true,
    message: active
      ? `${volunteer.name} can sign in again.`
      : `${volunteer.name} is disabled and signed out.`,
  };
}

export async function resetVolunteerPassword(volunteerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const password = tempPassword();

  const volunteer = await prisma.adminUser.update({
    where: { id: volunteerId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  await prisma.adminSession.deleteMany({ where: { adminId: volunteerId } });

  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "VOLUNTEER_PASSWORD_RESET",
    entity: "AdminUser",
    entityId: volunteerId,
  });

  revalidatePath("/admin/volunteers");
  return { ok: true, message: `New password for ${volunteer.name}.`, password };
}
