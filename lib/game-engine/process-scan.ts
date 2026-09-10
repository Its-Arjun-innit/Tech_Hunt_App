import { ScanResult, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { advanceTeam, type NextObjective } from "./advance";

export type ScanOutcome =
  | {
      ok: true;
      checkpointName: string;
      pointsAwarded: number;
      teamScore: number;
      /** Set when the checkpoint has a challenge the team must still complete. */
      challengeId: string | null;
      next: NextObjective | null;
      finished: boolean;
    }
  | { ok: false; result: ScanResult; message: string };

/** Scans per player per minute. DB-backed so it survives serverless restarts. */
const RATE_LIMIT_PER_MINUTE = 10;

const MESSAGES: Record<ScanResult, string> = {
  SUCCESS: "Checkpoint completed.",
  DUPLICATE: "Your team has already completed this checkpoint.",
  INVALID_TOKEN: "That QR code is not recognised.",
  INACTIVE_CHECKPOINT: "This checkpoint is currently disabled.",
  WRONG_CHECKPOINT: "This is not your assigned checkpoint. Follow your current clue.",
  GAME_NOT_ACTIVE: "The game is not running right now.",
  TEAM_DISABLED: "Your team is not active. Contact an organizer.",
  RATE_LIMITED: "Too many scans. Wait a moment and try again.",
};

/**
 * The whole scan pipeline: validate, record, score, route, reserve, clue.
 *
 * Everything runs in one transaction with a row lock on the team, so two
 * simultaneous scans by two members of the same team cannot both award points.
 */
export async function processScan(args: {
  playerId: string;
  teamId: string;
  gameId: string;
  qrToken: string;
  ip?: string | null;
  userAgent?: string | null;
  random?: () => number;
}): Promise<ScanOutcome> {
  return prisma.$transaction(
    async (tx) => {
      // Serialize concurrent scans for this team before reading any state.
      await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${args.teamId} FOR UPDATE`;

      const reject = async (result: ScanResult, checkpointId: string | null) => {
        await recordScan(tx, { ...args, checkpointId, result, pointsAwarded: 0 });
        return { ok: false as const, result, message: MESSAGES[result] };
      };

      const [game, team, checkpoint, recentScanCount] = await Promise.all([
        tx.game.findUnique({ where: { id: args.gameId } }),
        tx.team.findUnique({ where: { id: args.teamId } }),
        tx.checkpoint.findUnique({
          where: { qrToken: args.qrToken },
          include: { challenge: true },
        }),
        tx.scanEvent.count({
          where: { playerId: args.playerId, createdAt: { gte: new Date(Date.now() - 60_000) } },
        }),
      ]);

      if (recentScanCount >= RATE_LIMIT_PER_MINUTE) {
        return reject(ScanResult.RATE_LIMITED, null);
      }
      if (!checkpoint || checkpoint.gameId !== args.gameId) {
        return reject(ScanResult.INVALID_TOKEN, null);
      }
      if (!game || game.status !== "ACTIVE" || game.scansLocked) {
        return reject(ScanResult.GAME_NOT_ACTIVE, checkpoint.id);
      }
      if (!team || team.status !== "ACTIVE") {
        return reject(ScanResult.TEAM_DISABLED, checkpoint.id);
      }
      if (!checkpoint.active) {
        return reject(ScanResult.INACTIVE_CHECKPOINT, checkpoint.id);
      }

      const alreadyDone = await tx.scanEvent.findFirst({
        where: { teamId: team.id, checkpointId: checkpoint.id, result: "SUCCESS" },
        select: { id: true },
      });
      if (alreadyDone) return reject(ScanResult.DUPLICATE, checkpoint.id);

      // Routing enforcement: the team must scan the checkpoint it was sent to.
      // The very first scan of the game has no assignment yet, so it is allowed.
      const assignment = await tx.routingAssignment.findFirst({
        where: { teamId: team.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (game.enforceRouting && assignment && assignment.checkpointId !== checkpoint.id) {
        return reject(ScanResult.WRONG_CHECKPOINT, checkpoint.id);
      }

      // ── Commit the success ────────────────────────────────────────
      const pointsAwarded = game.scoringFrozen ? 0 : checkpoint.points;

      if (pointsAwarded > 0) {
        await tx.scoreEvent.create({
          data: {
            teamId: team.id,
            type: "CHECKPOINT",
            points: pointsAwarded,
            refId: checkpoint.id,
            note: `Checkpoint: ${checkpoint.name}`,
          },
        });
      }

      if (assignment && assignment.checkpointId === checkpoint.id) {
        await tx.routingAssignment.update({
          where: { id: assignment.id },
          data: { status: "COMPLETED" },
        });
      }

      const updatedTeam = await tx.team.update({
        where: { id: team.id },
        data: {
          score: { increment: pointsAwarded },
          currentCheckpointId: checkpoint.id,
        },
      });

      // A checkpoint with a challenge holds the team here until it is solved;
      // routing runs once the challenge resolves.
      const hasChallenge = Boolean(checkpoint.challenge?.active);
      let next: NextObjective | null = null;
      if (!hasChallenge) {
        next = await advanceTeam(tx, {
          gameId: args.gameId,
          teamId: team.id,
          fromCheckpointId: checkpoint.id,
          routingConfig: game.routingConfig,
          random: args.random,
        });
      }

      await recordScan(tx, {
        ...args,
        checkpointId: checkpoint.id,
        result: ScanResult.SUCCESS,
        pointsAwarded,
        routingReason: next?.reason ?? null,
      });

      await tx.gameEvent.create({
        data: {
          gameId: args.gameId,
          teamId: team.id,
          type: "CHECKPOINT_COMPLETED",
          message: `${team.name} completed ${checkpoint.name} (+${pointsAwarded})`,
        },
      });

      const totalCheckpoints = await tx.checkpoint.count({
        where: { gameId: args.gameId, active: true },
      });
      const completed = await tx.scanEvent.count({
        where: { teamId: team.id, result: "SUCCESS" },
      });

      return {
        ok: true as const,
        checkpointName: checkpoint.name,
        pointsAwarded,
        teamScore: updatedTeam.score,
        challengeId: hasChallenge ? checkpoint.challenge!.id : null,
        next,
        finished: !hasChallenge && next === null && completed >= totalCheckpoints,
      };
    },
    { timeout: 15_000 },
  );
}

async function recordScan(
  tx: Prisma.TransactionClient,
  args: {
    teamId: string;
    playerId: string;
    checkpointId: string | null;
    result: ScanResult;
    pointsAwarded: number;
    routingReason?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  },
) {
  await tx.scanEvent.create({
    data: {
      teamId: args.teamId,
      playerId: args.playerId,
      checkpointId: args.checkpointId,
      result: args.result,
      pointsAwarded: args.pointsAwarded,
      routingReason: args.routingReason ?? null,
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
    },
  });
}
