import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE } from "./session";

/** Higher number means more authority. */
const RANK: Record<AdminRole, number> = {
  VOLUNTEER: 1,
  GAME_ADMIN: 2,
  SUPER_ADMIN: 3,
};

export async function getAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { token },
    include: { admin: { include: { checkpoint: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (!session.admin.active) return null;
  return session.admin;
}

export type AdminContext = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;

/**
 * Gate for every admin page and server action. Volunteers can never reach
 * GAME_ADMIN routes, and admin routes are never reachable with a player cookie.
 */
export async function requireAdmin(minRole: AdminRole = AdminRole.GAME_ADMIN): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (RANK[admin.role] < RANK[minRole]) {
    // A volunteer who lands on an admin page goes to their own console.
    redirect(admin.role === AdminRole.VOLUNTEER ? "/volunteer" : "/admin/login");
  }
  return admin;
}

export function hasRole(admin: AdminContext, minRole: AdminRole) {
  return RANK[admin.role] >= RANK[minRole];
}

/** Writes an audit row. Called by every admin mutation. */
export async function auditLog(entry: {
  gameId?: string | null;
  actorType?: "ADMIN" | "PLAYER" | "SYSTEM";
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  await prisma.auditLog
    .create({
      data: {
        gameId: entry.gameId ?? null,
        actorType: entry.actorType ?? "ADMIN",
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        meta: (entry.meta ?? undefined) as never,
      },
    })
    .catch(() => {});
}
