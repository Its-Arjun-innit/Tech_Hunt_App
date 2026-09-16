import type { Prisma } from "@prisma/client";
import { chooseNextCheckpoint, type RouteCandidate } from "@/lib/routing/engine";
import { resolveRoutingConfig } from "@/lib/routing/config";
import { loadTrafficContext } from "@/lib/routing/traffic-context";

export type NextObjective = {
  checkpointId: string;
  checkpointName: string;
  clue: string | null;
  clueLevel: number;
  estimatedTravelTime: number;
  reason: string;
  assignmentId: string;
};

/**
 * Picks the team's next destination, records the assignment (which doubles as
 * the soft reservation) and returns the clue for that destination.
 *
 * Runs inside the caller's transaction so a scan either commits everything or
 * nothing.
 */
export async function advanceTeam(
  tx: Prisma.TransactionClient,
  args: {
    gameId: string;
    teamId: string;
    fromCheckpointId: string | null;
    routingConfig: unknown;
    /** Injectable for deterministic tests. */
    random?: () => number;
  },
): Promise<NextObjective | null> {
  const cfg = resolveRoutingConfig(args.routingConfig);

  const [trafficCtx, checkpointsWithClues, allowed, teamScans] = await Promise.all([
    loadTrafficContext(tx, { gameId: args.gameId, excludeTeamId: args.teamId, config: cfg }),
    tx.checkpoint.findMany({
      where: { gameId: args.gameId },
      include: { clues: { orderBy: { level: "asc" } } },
    }),
    args.fromCheckpointId
      ? tx.checkpointRoute.findMany({
          where: { fromId: args.fromCheckpointId },
          select: { toId: true },
        })
      : Promise.resolve([] as { toId: string }[]),
    tx.scanEvent.findMany({
      where: { result: "SUCCESS", teamId: args.teamId },
      select: { checkpointId: true },
    }),
  ]);

  const allowedIds = new Set(allowed.map((r) => r.toId));
  const visited = new Set(teamScans.map((s) => s.checkpointId).filter(Boolean) as string[]);

  const from = args.fromCheckpointId
    ? checkpointsWithClues.find((c) => c.id === args.fromCheckpointId) ?? null
    : null;

  const candidates: RouteCandidate[] = checkpointsWithClues
    .filter((c) => c.id !== args.fromCheckpointId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      latitude: c.latitude,
      longitude: c.longitude,
      capacity: c.capacity,
      difficulty: c.difficulty,
      active: c.active,
      routeGroup: c.routeGroup,
      occupancy: trafficCtx.occupancy.get(c.id) ?? 0,
      approaching: trafficCtx.approaching.get(c.id) ?? 0,
      recentVisits: trafficCtx.recentVisits.get(c.id) ?? 0,
      visitedByTeam: visited.has(c.id),
      allowedNext: allowedIds.has(c.id),
    }));

  const decision = chooseNextCheckpoint({
    from: from
      ? { latitude: from.latitude, longitude: from.longitude, routeGroup: from.routeGroup }
      : null,
    candidates,
    visitedCount: visited.size,
    totalCheckpoints: checkpointsWithClues.length,
    config: cfg,
    random: args.random,
  });

  if (!decision) return null;

  const target = checkpointsWithClues.find((c) => c.id === decision.checkpointId)!;
  const firstClue = target.clues[0] ?? null;
  const reason = `Selected ${target.name}: ${decision.reason.join("; ")}.`;

  // Retire any assignment the team was still holding, then reserve the new one.
  await tx.routingAssignment.updateMany({
    where: { teamId: args.teamId, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });

  const assignment = await tx.routingAssignment.create({
    data: {
      teamId: args.teamId,
      checkpointId: target.id,
      fromCheckpointId: args.fromCheckpointId,
      score: decision.score,
      reason,
      estimatedTravelTime: decision.estimatedTravelTime,
      clueId: firstClue?.id ?? null,
      clueLevel: 1,
      expiresAt: new Date(Date.now() + cfg.reservationTtlSeconds * 1000),
    },
  });

  return {
    checkpointId: target.id,
    checkpointName: target.name,
    clue: firstClue?.text ?? null,
    clueLevel: 1,
    estimatedTravelTime: decision.estimatedTravelTime,
    reason,
    assignmentId: assignment.id,
  };
}
