import { ROUTING_CONFIG, type RoutingConfig } from "./config";

export type RouteCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  difficulty: number;
  active: boolean;
  routeGroup: string | null;
  /** Teams standing here right now. */
  occupancy: number;
  /** Teams already routed here and still holding a live reservation. */
  approaching: number;
  /** Visits by any team inside the recent-visit window. */
  recentVisits: number;
  /** This team has already completed it. */
  visitedByTeam: boolean;
  /** Explicitly allowed as a next hop from the current checkpoint. */
  allowedNext: boolean;
};

export type RoutingInput = {
  from: { latitude: number; longitude: number; routeGroup: string | null } | null;
  candidates: RouteCandidate[];
  /** Checkpoints this team has completed, used for progression. */
  visitedCount: number;
  totalCheckpoints: number;
  config?: RoutingConfig;
  /** Injectable for deterministic tests. */
  random?: () => number;
};

export type RoutingDecision = {
  checkpointId: string;
  score: number;
  reason: string[];
  estimatedTravelTime: number;
  distanceMeters: number;
};

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance in metres. */
export function haversine(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Score every candidate and return the best one, or null when the team has
 * nowhere left to go. Pure and synchronous so it can be unit tested without a
 * database; the caller is responsible for loading live game context.
 */
export function chooseNextCheckpoint(input: RoutingInput): RoutingDecision | null {
  const cfg = input.config ?? ROUTING_CONFIG;
  const random = input.random ?? Math.random;

  // Prefer explicitly allowed next hops. Fall back to the wider pool only when
  // the organizer defined no routes out of this checkpoint.
  const hasAllowList = input.candidates.some((c) => c.allowedNext);
  let pool = input.candidates.filter(
    (c) => c.active && !c.visitedByTeam && (!hasAllowList || c.allowedNext),
  );

  // Everything nearby is visited: let the team revisit rather than dead-end.
  if (pool.length === 0) {
    pool = input.candidates.filter((c) => c.active && (!hasAllowList || c.allowedNext));
  }
  if (pool.length === 0) return null;

  const progressRatio =
    input.totalCheckpoints > 0
      ? Math.min(1, input.visitedCount / input.totalCheckpoints)
      : 0;

  let best: RoutingDecision | null = null;

  for (const c of pool) {
    const reason: string[] = [];
    const distance = input.from ? haversine(input.from, c) : cfg.idealDistanceMeters;

    // Proximity: peaks at the ideal walking distance, decays either side.
    const spread = Math.max(cfg.idealDistanceMeters, 1);
    const proximity = Math.max(
      0,
      1 - Math.abs(distance - cfg.idealDistanceMeters) / (spread * 2),
    );
    let score = cfg.distanceWeight * proximity;
    if (distance > cfg.maxDistanceMeters) {
      score -= cfg.distanceWeight;
      reason.push(`${Math.round(distance)}m is beyond the preferred range`);
    } else {
      reason.push(`${Math.round(distance)}m away`);
    }

    // Progression: unvisited ground is worth more as the game goes on.
    if (!c.visitedByTeam) {
      score += cfg.progressionWeight * (0.5 + progressRatio / 2);
      reason.push("team has not visited it");
    } else {
      score -= cfg.progressionWeight;
      reason.push("team already completed it");
    }

    // Difficulty ramp: easy checkpoints early, harder ones later.
    const targetDifficulty = 1 + progressRatio * 4;
    const difficultyFit = 1 - Math.abs(c.difficulty - targetDifficulty) / 4;
    score += cfg.difficultyWeight * difficultyFit;

    // Route group compatibility.
    if (input.from?.routeGroup && c.routeGroup === input.from.routeGroup) {
      score += cfg.routeCompatibilityWeight;
      reason.push("matches route group");
    }
    if (c.allowedNext) {
      score += cfg.routeCompatibilityWeight;
      reason.push("is an allowed next checkpoint");
    }

    // Congestion pressure.
    if (c.occupancy > 0) {
      score -= cfg.congestionWeight * c.occupancy;
      reason.push(`${c.occupancy} team(s) currently there`);
    }
    if (c.approaching > 0) {
      score -= cfg.approachingWeight * c.approaching;
      reason.push(`${c.approaching} team(s) already heading there`);
    }
    if (c.occupancy + c.approaching >= c.capacity) {
      score -= cfg.capacityWeight;
      reason.push(`at capacity (${c.capacity})`);
    } else {
      reason.push("has capacity");
    }
    if (c.recentVisits > 0) {
      score -= cfg.recentVisitWeight * c.recentVisits;
      reason.push(`${c.recentVisits} recent visit(s)`);
    }

    // Tie-break so two teams scanning the same checkpoint at once diverge.
    score += random() * cfg.jitter;

    if (!best || score > best.score) {
      best = {
        checkpointId: c.id,
        score,
        reason,
        distanceMeters: distance,
        estimatedTravelTime: Math.round(distance / Math.max(cfg.walkingSpeedMps, 0.1)),
      };
    }
  }

  return best;
}
