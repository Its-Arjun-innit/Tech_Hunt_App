"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth/player";
import { requestMeta } from "@/lib/auth/session";
import { processScan, type ScanOutcome } from "@/lib/game-engine/process-scan";
import { extractToken } from "@/lib/qr/token";

/**
 * The only entry point a player has into scoring. The team is taken from the
 * session, never from the request body.
 */
export async function submitScan(rawToken: string): Promise<ScanOutcome> {
  const { player, team, game } = await requirePlayer();

  const token = extractToken(rawToken);
  if (!token) {
    return { ok: false, result: "INVALID_TOKEN", message: "That QR code is not recognised." };
  }

  const { ip, userAgent } = await requestMeta();
  const outcome = await processScan({
    playerId: player.id,
    teamId: team.id,
    gameId: game.id,
    qrToken: token,
    ip,
    userAgent,
  });

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return outcome;
}
