"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createStudentSession, destroyStudentSession, requestMeta } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/staff";

const schema = z.object({
  rollNo: z.string().trim().min(1, "Enter your roll number"),
  pin: z.string().trim().regex(/^\d{6}$/, "PIN must be 6 digits"),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

const FAILED_LIMIT = 8;
const FAILED_WINDOW_MS = 15 * 60_000;

/** Only same-site paths, so a crafted ?next= cannot bounce a student off-site. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
}

export async function studentLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    rollNo: formData.get("rollNo"),
    pin: formData.get("pin"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const { pin, next } = parsed.data;
  const rollNo = parsed.data.rollNo.toUpperCase();
  const { ip } = await requestMeta();

  // Six digits is a million guesses; this makes them slow.
  const failures = await prisma.auditLog.count({
    where: { action: "STUDENT_LOGIN_FAILED", entityId: rollNo, createdAt: { gte: new Date(Date.now() - FAILED_WINDOW_MS) } },
  });
  if (failures >= FAILED_LIMIT) return { error: "Too many attempts. Wait 15 minutes or ask the office to reset your PIN." };

  const student = await prisma.student.findUnique({ where: { rollNo } });
  const generic = { error: "Roll number or PIN is incorrect." };
  const valid = student
    ? await bcrypt.compare(pin, student.pinHash)
    : await bcrypt.compare(pin, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv").then(() => false);

  if (!student || !valid) {
    await auditLog({ actorType: "STUDENT", action: "STUDENT_LOGIN_FAILED", entity: "Student", entityId: rollNo, ip });
    return generic;
  }
  if (student.status !== "ACTIVE") return { error: "Your account is disabled. Contact the college office." };

  await createStudentSession(student.id);
  await auditLog({
    actorType: "STUDENT",
    actorId: student.id,
    actorName: `${student.rollNo} ${student.name}`,
    action: "STUDENT_LOGIN",
    entity: "Student",
    entityId: student.id,
    ip,
  });

  redirect(safeNext(next));
}

export async function studentLogout() {
  await destroyStudentSession();
  redirect("/login");
}
