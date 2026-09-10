import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PLAYER_COOKIE } from "./session";

/**
 * The authenticated player plus the team and game they belong to. Every player
 * server action and page resolves the team from here, never from client input.
 */
export async function getPlayer() {
  const token = (await cookies()).get(PLAYER_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      player: { include: { team: { include: { game: true } } } },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (session.player.status !== "ACTIVE") return null;

  return {
    sessionId: session.id,
    player: session.player,
    team: session.player.team,
    game: session.player.team.game,
  };
}

export type PlayerContext = NonNullable<Awaited<ReturnType<typeof getPlayer>>>;

/** Redirects to login when the session is missing, expired or revoked. */
export async function requirePlayer(): Promise<PlayerContext> {
  const ctx = await getPlayer();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Best-effort presence tracking for the "online members" list. */
export async function touchPlayer(playerId: string) {
  await prisma.player
    .update({ where: { id: playerId }, data: { lastActiveAt: new Date() } })
    .catch(() => {});
}
