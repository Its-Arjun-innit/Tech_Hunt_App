import type { Prisma } from "@prisma/client";
import { resolveRoutingConfig, type RoutingConfig } from "./config";

export type TrafficContext = {
  checkpoints: { id: string; capacity: number; active: boolean }[];
  approaching: Map<string, number>;
  occupancy: Map<string, number>;
  recentVisits: Map<string, number>;
};

/**
 * Loads the raw traffic data needed by both `getCheckpointTraffic` (admin UI)
 * and `advanceTeam` (routing engine). Deduplicates the Prisma queries that
 * were previously duplicated across traffic.ts and advance.ts.
 */
export async function loadTrafficContext(
  tx: Prisma.TransactionClient,
  args: {
    gameId: string;
    excludeTeamId?: string;
    config?: RoutingConfig;
  },
): Promise<TrafficContext> {
  const cfg = args.config ?? resolveRoutingConfig(null);
  const now = new Date();
  const occupancySince = new Date(now.getTime() - cfg.occupancyWindowSeconds * 1000);
  const recentSince = new Date(now.getTime() - cfg.recentVisitWindowSeconds * 1000);

  const [checkpoints, assignments, recentScans] = await Promise.all([
    tx.checkpoint.findMany({
      where: { gameId: args.gameId },
      select: { id: true, capacity: true, active: true },
    }),
    tx.routingAssignment.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { gt: now },
        team: { gameId: args.gameId },
        ...(args.excludeTeamId ? { teamId: { not: args.excludeTeamId } } : {}),
      },
      select: { checkpointId: true },
    }),
    tx.scanEvent.findMany({
      where: { result: "SUCCESS", createdAt: { gte: recentSince }, team: { gameId: args.gameId } },
      select: { checkpointId: true, teamId: true, createdAt: true },
    }),
  ]);

  const approaching = new Map<string, number>();
  for (const a of assignments) {
    approaching.set(a.checkpointId, (approaching.get(a.checkpointId) ?? 0) + 1);
  }

  const latestByTeam = new Map<string, { checkpointId: string | null; at: Date }>();
  const recentVisits = new Map<string, number>();
  for (const s of recentScans) {
    if (!s.checkpointId) continue;
    recentVisits.set(s.checkpointId, (recentVisits.get(s.checkpointId) ?? 0) + 1);
    const prev = latestByTeam.get(s.teamId);
    if (!prev || prev.at < s.createdAt) {
      latestByTeam.set(s.teamId, { checkpointId: s.checkpointId, at: s.createdAt });
    }
  }

  const occupancy = new Map<string, number>();
  for (const [teamId, v] of latestByTeam) {
    if (args.excludeTeamId && teamId === args.excludeTeamId) continue;
    if (!v.checkpointId || v.at < occupancySince) continue;
    occupancy.set(v.checkpointId, (occupancy.get(v.checkpointId) ?? 0) + 1);
  }

  return { checkpoints, approaching, occupancy, recentVisits };
}
