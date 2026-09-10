import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { generateSessionToken } from "@/lib/qr/token";

export const PLAYER_COOKIE = "th_player";
export const ADMIN_COOKIE = "th_admin";

const PLAYER_TTL_HOURS = 12;
const ADMIN_TTL_HOURS = 12;

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Client IP and user agent, for the scan audit trail. */
export async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

/**
 * Starts a player session. Any existing session for the player is deleted
 * first, which enforces one active device per player and makes admin
 * "force logout" a simple session delete.
 */
export async function createPlayerSession(playerId: string) {
  const { ip, userAgent } = await requestMeta();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + PLAYER_TTL_HOURS * 3600_000);

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { playerId } }),
    prisma.session.create({
      data: { token, playerId, expiresAt, ip, userAgent },
    }),
    prisma.player.update({
      where: { id: playerId },
      data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
    }),
  ]);

  (await cookies()).set(PLAYER_COOKIE, token, cookieOptions(expiresAt));
}

export async function createAdminSession(adminId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + ADMIN_TTL_HOURS * 3600_000);

  await prisma.adminSession.create({ data: { token, adminId, expiresAt } });
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { lastLoginAt: new Date() },
  });

  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions(expiresAt));
}

export async function destroyPlayerSession() {
  const store = await cookies();
  const token = store.get(PLAYER_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  store.delete(PLAYER_COOKIE);
}

export async function destroyAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { token } });
  store.delete(ADMIN_COOKIE);
}
