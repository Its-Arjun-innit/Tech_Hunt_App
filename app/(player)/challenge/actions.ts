"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth/player";
import { submitChallenge, type ChallengeOutcome } from "@/lib/game-engine/complete-challenge";

/**
 * Grading happens entirely on the server; the browser only ever posts the raw
 * submission and receives a verdict.
 */
export async function submitChallengeAnswer(
  challengeId: string,
  submission: unknown,
): Promise<ChallengeOutcome> {
  const { team, game } = await requirePlayer();

  const outcome = await submitChallenge({
    teamId: team.id,
    gameId: game.id,
    challengeId,
    submission,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/challenge/${challengeId}`);
  revalidatePath("/leaderboard");
  return outcome;
}
