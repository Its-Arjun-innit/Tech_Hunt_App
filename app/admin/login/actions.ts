"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAdminSession, destroyAdminSession } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/admin";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginState = { error?: string };

/**
 * Shared by the admin and volunteer sign-in pages. The destination depends on
 * the account role, so a volunteer can never land in the admin console.
 */
export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const admin = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  const generic = { error: "Email or password is incorrect." };
  if (!admin) {
    await bcrypt.compare(parsed.data.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return generic;
  }
  if (!(await bcrypt.compare(parsed.data.password, admin.passwordHash))) return generic;
  if (!admin.active) return { error: "This account is disabled." };

  await createAdminSession(admin.id);
  await auditLog({
    actorId: admin.id,
    actorName: admin.email,
    action: "ADMIN_LOGIN",
    entity: "AdminUser",
    entityId: admin.id,
  });

  redirect(admin.role === "VOLUNTEER" ? "/volunteer" : "/admin");
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/admin/login");
}
