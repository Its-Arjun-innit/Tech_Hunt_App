import { prisma } from "@/lib/db";
import type { RoutingConfig } from "./config";
import { loadTrafficContext } from "./traffic-context";

export type TrafficState = "GREEN" | "YELLOW" | "RED" | "GRAY";

export type CheckpointTraffic = {
  checkpointId: string;
  occupancy: number;
  approaching: number;
  capacity: number;
  recentVisits: number;
  state: TrafficState;
};

/**
 * Live traffic per checkpoint, computed on read. Reservations expire by
 * comparing expiresAt to now, so no cron job or background worker is needed
 * (important on Vercel serverless).
 */
export async function getCheckpointTraffic(
  gameId: string,
  config?: RoutingConfig,
): Promise<Map<string, CheckpointTraffic>> {
  const ctx = await loadTrafficContext(prisma, { gameId, config });

  const out = new Map<string, CheckpointTraffic>();
  for (const cp of ctx.checkpoints) {
    const occ = ctx.occupancy.get(cp.id) ?? 0;
    const app = ctx.approaching.get(cp.id) ?? 0;
    let state: TrafficState = "GREEN";
    if (!cp.active) state = "GRAY";
    else if (occ + app >= cp.capacity) state = "RED";
    else if (app > 0) state = "YELLOW";

    out.set(cp.id, {
      checkpointId: cp.id,
      occupancy: occ,
      approaching: app,
      capacity: cp.capacity,
      recentVisits: ctx.recentVisits.get(cp.id) ?? 0,
      state,
    });
  }
  return out;
}
