import { ScanResult } from "@prisma/client";

export type ScanInput = {
  gameActive: boolean;
  gameScansLocked: boolean;
  gameEnforceRouting: boolean;
  gameScoringFrozen: boolean;
  teamActive: boolean;
  checkpointExists: boolean;
  checkpointGameId: string;
  checkpointActive: boolean;
  checkpointPoints: number;
  hasChallenge: boolean;
  alreadyScanned: boolean;
  assignmentCheckpointId: string | null;
  recentScanCount: number;
  rateLimit?: number;
};

export type ScanValidation =
  | { ok: true; pointsAwarded: number }
  | { ok: false; result: ScanResult };

const RATE_LIMIT_PER_MINUTE = 10;

/**
 * Pure validation function: decides whether a scan is valid and how many
 * points to award. No I/O, no database — just data in, decision out.
 *
 * This is the seam that makes scan validation testable without a database.
 */
export function validateScan(
  input: ScanInput,
  rateLimit: number = RATE_LIMIT_PER_MINUTE,
): ScanValidation {
  if (input.recentScanCount >= rateLimit) {
    return { ok: false, result: ScanResult.RATE_LIMITED };
  }
  if (!input.checkpointExists || input.checkpointGameId !== "?") {
    // checkpointGameId is compared by the caller; here we only flag missing
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
  if (input.alreadyScanned) {
    return { ok: false, result: ScanResult.DUPLICATE };
  }
  if (
    input.gameEnforceRouting &&
    input.assignmentCheckpointId !== null &&
    input.assignmentCheckpointId !== "?"
  ) {
    // Caller handles the actual assignment.checkpointId !== checkpoint.id check
  }
  if (input.gameEnforceRouting && input.assignmentCheckpointId !== null) {
    return { ok: false, result: ScanResult.WRONG_CHECKPOINT };
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
