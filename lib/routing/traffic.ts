import { prisma } from "@/lib/db";
import { resolveRoutingConfig, type RoutingConfig } from "./config";

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
  const cfg = config ?? resolveRoutingConfig(null);
  const now = new Date();
  const occupancySince = new Date(now.getTime() - cfg.occupancyWindowSeconds * 1000);
  const recentSince = new Date(now.getTime() - cfg.recentVisitWindowSeconds * 1000);

  const [checkpoints, assignments, recentScans] = await Promise.all([
    prisma.checkpoint.findMany({
      where: { gameId },
      select: { id: true, capacity: true, active: true },
    }),
    // ACTIVE and unexpired assignments are the soft reservations.
    prisma.routingAssignment.findMany({
      where: { status: "ACTIVE", expiresAt: { gt: now }, team: { gameId } },
      select: { checkpointId: true },
    }),
    prisma.scanEvent.findMany({
      where: { result: "SUCCESS", createdAt: { gte: recentSince }, team: { gameId } },
      select: { checkpointId: true, teamId: true, createdAt: true },
    }),
  ]);

  const approaching = new Map<string, number>();
  for (const a of assignments) {
    approaching.set(a.checkpointId, (approaching.get(a.checkpointId) ?? 0) + 1);
  }

  // A team counts as present at the checkpoint it most recently scanned,
  // for as long as the occupancy window lasts.
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
  for (const { checkpointId, at } of latestByTeam.values()) {
    if (!checkpointId || at < occupancySince) continue;
    occupancy.set(checkpointId, (occupancy.get(checkpointId) ?? 0) + 1);
  }

  const out = new Map<string, CheckpointTraffic>();
  for (const cp of checkpoints) {
    const occ = occupancy.get(cp.id) ?? 0;
    const app = approaching.get(cp.id) ?? 0;
    let state: TrafficState = "GREEN";
    if (!cp.active) state = "GRAY";
    else if (occ + app >= cp.capacity) state = "RED";
    else if (app > 0) state = "YELLOW";

    out.set(cp.id, {
      checkpointId: cp.id,
      occupancy: occ,
      approaching: app,
      capacity: cp.capacity,
      recentVisits: recentVisits.get(cp.id) ?? 0,
      state,
    });
  }
  return out;
}

/**
 * Presentation for each traffic state.
 *
 * Colour, word and glyph travel together on purpose. The brand colour is lime
 * and "available" is emerald, so colour alone is not a reliable signal; the
 * label and icon are what actually carry the meaning. See the colour rules at
 * the top of app/globals.css.
 */
export const TRAFFIC_LABEL: Record<TrafficState, string> = {
  GREEN: "Available",
  YELLOW: "Teams approaching",
  RED: "Congested",
  GRAY: "Disabled",
};

/** Lucide icon name per state, so the glyph differs as well as the fill. */
export const TRAFFIC_ICON: Record<TrafficState, "check" | "arrow" | "alert" | "off"> = {
  GREEN: "check",
  YELLOW: "arrow",
  RED: "alert",
  GRAY: "off",
};

export const TRAFFIC_CLASS: Record<TrafficState, string> = {
  GREEN: "bg-success-subtle text-success-strong border-success/30",
  YELLOW: "bg-warning-subtle text-warning-foreground border-warning/40 dark:text-warning",
  RED: "bg-danger-subtle text-danger border-danger/30",
  GRAY: "bg-muted text-muted-foreground border-border",
};

/** Solid fill for map markers and dots. */
export const TRAFFIC_FILL: Record<TrafficState, string> = {
  GREEN: "var(--success)",
  YELLOW: "var(--warning)",
  RED: "var(--danger)",
  GRAY: "var(--faint-foreground)",
};
