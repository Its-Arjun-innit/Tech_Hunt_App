import { ScanResult, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordScore } from "@/lib/scoring/events";
import { validateScan, SCAN_MESSAGES } from "./validate";
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
        return { ok: false as const, result, message: SCAN_MESSAGES[result] };
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

      // Everything decidable from the rows already fetched.
      const pureCheck = validateScan({
        gameActive: game?.status === "ACTIVE",
        gameScansLocked: game?.scansLocked ?? true,
        gameScoringFrozen: game?.scoringFrozen ?? false,
        teamActive: team?.status === "ACTIVE",
        checkpointExists: !!checkpoint && checkpoint.gameId === args.gameId,
        checkpointActive: checkpoint?.active ?? false,
        checkpointPoints: checkpoint?.points ?? 0,
        recentScanCount,
      });

      if (!pureCheck.ok) {
        const checkpointId = checkpoint?.id ?? null;
        return reject(pureCheck.result, checkpointId);
      }

      // At this point, game, team, checkpoint are validated as existing and correct
      const gameData = game!;
      const teamData = team!;
      const checkpointData = checkpoint!;

      // DB-dependent validation: duplicate scan check
      const alreadyDone = await tx.scanEvent.findFirst({
        where: { teamId: teamData.id, checkpointId: checkpointData.id, result: "SUCCESS" },
        select: { id: true },
      });
      if (alreadyDone) return reject(ScanResult.DUPLICATE, checkpointData.id);

      // DB-dependent validation: routing enforcement
      const assignment = await tx.routingAssignment.findFirst({
        where: { teamId: teamData.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (
        gameData.enforceRouting &&
        assignment &&
        assignment.checkpointId !== checkpointData.id
      ) {
        return reject(ScanResult.WRONG_CHECKPOINT, checkpointData.id);
      }

      // ── Commit the success ────────────────────────────────────────
      const pointsAwarded = pureCheck.pointsAwarded;

      await recordScore(tx, {
        teamId: teamData.id,
        points: pointsAwarded,
        type: "CHECKPOINT",
        refId: checkpointData.id,
        note: `Checkpoint: ${checkpointData.name}`,
      });

      if (assignment && assignment.checkpointId === checkpointData.id) {
        await tx.routingAssignment.update({
          where: { id: assignment.id },
          data: { status: "COMPLETED" },
        });
      }

      const updatedTeam = await tx.team.update({
        where: { id: teamData.id },
        data: { currentCheckpointId: checkpointData.id },
      });

      // A checkpoint with a challenge holds the team here until it is solved;
      // routing runs once the challenge resolves.
      const hasChallenge = Boolean(checkpointData.challenge?.active);
      let next: NextObjective | null = null;
      if (!hasChallenge) {
        next = await advanceTeam(tx, {
          gameId: args.gameId,
          teamId: teamData.id,
          fromCheckpointId: checkpointData.id,
          routingConfig: gameData.routingConfig,
          random: args.random,
        });
      }

      await recordScan(tx, {
        ...args,
        checkpointId: checkpointData.id,
        result: ScanResult.SUCCESS,
        pointsAwarded,
        routingReason: next?.reason ?? null,
      });

      await tx.gameEvent.create({
        data: {
          gameId: args.gameId,
          teamId: teamData.id,
          type: "CHECKPOINT_COMPLETED",
          message: `${teamData.name} completed ${checkpointData.name} (+${pointsAwarded})`,
        },
      });

      const totalCheckpoints = await tx.checkpoint.count({
        where: { gameId: args.gameId, active: true },
      });
      const completed = await tx.scanEvent.count({
        where: { teamId: teamData.id, result: "SUCCESS" },
      });

      return {
        ok: true as const,
        checkpointName: checkpointData.name,
        pointsAwarded,
        teamScore: updatedTeam.score,
        challengeId: hasChallenge ? checkpointData.challenge!.id : null,
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
