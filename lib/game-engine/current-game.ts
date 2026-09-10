import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const GAME_COOKIE = "th_game";

/**
 * The game the admin console is currently operating on. Defaults to the most
 * recently created game so a fresh install needs no setup step.
 */
export async function getCurrentGame() {
  const selected = (await cookies()).get(GAME_COOKIE)?.value;

  if (selected) {
    const game = await prisma.game.findUnique({ where: { id: selected } });
    if (game) return game;
  }
  return prisma.game.findFirst({ orderBy: { createdAt: "desc" } });
}

export async function requireCurrentGame() {
  const game = await getCurrentGame();
  if (!game) throw new Error("No game exists yet. Create one first.");
  return game;
}
