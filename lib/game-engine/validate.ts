import { ScanResult } from "@prisma/client";

export type ScanInput = {
  gameActive: boolean;
  gameScansLocked: boolean;
  gameScoringFrozen: boolean;
  teamActive: boolean;
  checkpointExists: boolean;
  checkpointActive: boolean;
  checkpointPoints: number;
  recentScanCount: number;
};

export type ScanValidation =
  | { ok: true; pointsAwarded: number }
  | { ok: false; result: ScanResult };

/** Scans per player per minute. DB-backed so it survives serverless restarts. */
const RATE_LIMIT_PER_MINUTE = 10;

/**
 * The synchronous half of scan validation: everything decidable from data
 * already fetched, plus how many points a success is worth.
 *
 * The duplicate-scan and routing checks are deliberately NOT here. Both need
 * their own query inside the same transaction as the row lock, so they live in
 * processScan where that transaction is. Passing them through this function
 * would mean placeholder arguments and rules that never run.
 *
 * Rejection order matters and is asserted in validate.test.ts: a rate-limited
 * player is turned away before the token is even looked at.
 */
export function validateScan(
  input: ScanInput,
  rateLimit: number = RATE_LIMIT_PER_MINUTE,
): ScanValidation {
  if (input.recentScanCount >= rateLimit) {
    return { ok: false, result: ScanResult.RATE_LIMITED };
  }
  if (!input.checkpointExists) {
    return { ok: false, result: ScanResult.INVALID_TOKEN };
  }
  if (!input.gameActive || input.gameScansLocked) {
    return { ok: false, result: ScanResult.GAME_NOT_ACTIVE };
  }
  if (!input.teamActive) {
    return { ok: false, result: ScanResult.TEAM_DISABLED };
  }
  if (!input.checkpointActive) {
    return { ok: false, result: ScanResult.INACTIVE_CHECKPOINT };
  }

  const pointsAwarded = input.gameScoringFrozen ? 0 : input.checkpointPoints;
  return { ok: true, pointsAwarded };
}

export const SCAN_MESSAGES: Record<ScanResult, string> = {
  SUCCESS: "Checkpoint completed.",
  DUPLICATE: "Your team has already completed this checkpoint.",
  INVALID_TOKEN: "That QR code is not recognised.",
  INACTIVE_CHECKPOINT: "This checkpoint is currently disabled.",
  WRONG_CHECKPOINT: "This is not your assigned checkpoint. Follow your current clue.",
  GAME_NOT_ACTIVE: "The game is not running right now.",
  TEAM_DISABLED: "Your team is not active. Contact an organizer.",
  RATE_LIMITED: "Too many scans. Wait a moment and try again.",
};
