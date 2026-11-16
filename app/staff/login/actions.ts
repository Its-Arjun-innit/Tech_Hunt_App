"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createStaffSession, destroyStaffSession, requestMeta } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/staff";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type StaffLoginState = { error?: string };

/** One sign-in for every staff role; the role decides where they land. */
export async function staffLogin(_prev: StaffLoginState, formData: FormData): Promise<StaffLoginState> {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const email = parsed.data.email.toLowerCase();
  const { ip } = await requestMeta();
  const failures = await prisma.auditLog.count({
    where: { action: "STAFF_LOGIN_FAILED", entityId: email, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
  });
  if (failures >= 8) return { error: "Too many attempts. Wait 15 minutes and try again." };

  const staff = await prisma.staff.findUnique({ where: { email } });
  const valid = staff
    ? await bcrypt.compare(parsed.data.password, staff.passwordHash)
    : await bcrypt.compare(parsed.data.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv").then(() => false);

  if (!staff || !valid) {
    await auditLog({ action: "STAFF_LOGIN_FAILED", entity: "Staff", entityId: email, ip });
    return { error: "Email or password is incorrect." };
  }
  if (!staff.active) return { error: "This account is disabled." };

  await createStaffSession(staff.id);
  await auditLog({ actorId: staff.id, actorName: staff.email, action: "STAFF_LOGIN", entity: "Staff", entityId: staff.id, ip });

  redirect(staff.role === "ADMIN" ? "/admin" : "/teacher");
}

export async function staffLogout() {
  await destroyStaffSession();
  redirect("/staff/login");
}
