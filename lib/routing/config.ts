/**
 * Tunable weights for the routing engine. Organizers can override any of these
 * per game (Game.routingConfig) without touching the engine.
 */
export type RoutingConfig = {
  /** Reward for being close. Applied to a 0..1 proximity score. */
  distanceWeight: number;
  /** Preferred walking distance in metres; distance score peaks here. */
  idealDistanceMeters: number;
  /** Beyond this, a candidate is heavily penalised but not excluded. */
  maxDistanceMeters: number;
  /** Penalty per team currently standing at the candidate. */
  congestionWeight: number;
  /** Penalty per team already routed to the candidate (soft reservation). */
  approachingWeight: number;
  /** Extra penalty once occupancy + approaching reaches capacity. */
  capacityWeight: number;
  /** Reward for candidates that keep the team moving through fresh ground. */
  progressionWeight: number;
  /** Reward for matching difficulty to how far the team has progressed. */
  difficultyWeight: number;
  /** Reward for staying inside the same route group. */
  routeCompatibilityWeight: number;
  /** Penalty per visit by any team within recentVisitWindowSeconds. */
  recentVisitWeight: number;
  recentVisitWindowSeconds: number;
  /** A team counts as "at" its checkpoint for this long after scanning. */
  occupancyWindowSeconds: number;
  /** Soft reservation lifetime. */
  reservationTtlSeconds: number;
  /** Average walking pace used for travel estimates. */
  walkingSpeedMps: number;
  /** Random tie-break so simultaneous scans still spread out. */
  jitter: number;
};

export const ROUTING_CONFIG: RoutingConfig = {
  distanceWeight: 30,
  idealDistanceMeters: 200,
  maxDistanceMeters: 800,
  congestionWeight: 40,
  approachingWeight: 35,
  capacityWeight: 60,
  progressionWeight: 15,
  difficultyWeight: 10,
  routeCompatibilityWeight: 20,
  recentVisitWeight: 8,
  recentVisitWindowSeconds: 900,
  occupancyWindowSeconds: 420,
  reservationTtlSeconds: 1800,
  walkingSpeedMps: 1.3,
  jitter: 3,
};

/** Merge per-game overrides over the defaults, ignoring unknown keys. */
export function resolveRoutingConfig(overrides: unknown): RoutingConfig {
  if (!overrides || typeof overrides !== "object") return ROUTING_CONFIG;
  const out = { ...ROUTING_CONFIG };
  for (const key of Object.keys(ROUTING_CONFIG) as (keyof RoutingConfig)[]) {
    const value = (overrides as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}
