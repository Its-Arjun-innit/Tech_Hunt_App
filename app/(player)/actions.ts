"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth/player";
import { requestNextClue } from "@/lib/game-engine/clues";

export type ClueState = { message?: string; error?: string };

/** Player asks for a clearer clue. Cost and gating are enforced server-side. */
export async function askForClue(): Promise<ClueState> {
  const { team, game } = await requirePlayer();
  const result = await requestNextClue({ teamId: team.id, gameId: game.id });

  if (!result.ok) return { error: result.message };

  revalidatePath("/dashboard");
  return {
    message:
      result.cost > 0
        ? `Clue ${result.level} unlocked for ${result.cost} points.`
        : `Clue ${result.level} unlocked.`,
  };
}
