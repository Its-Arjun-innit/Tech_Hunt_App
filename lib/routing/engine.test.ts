import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseNextCheckpoint, haversine, type RouteCandidate } from "./engine";
import { ROUTING_CONFIG } from "./config";

const FROM = { latitude: 28.5449, longitude: 77.1926, routeGroup: "north" };

function candidate(over: Partial<RouteCandidate> & { id: string }): RouteCandidate {
  return {
    name: over.id,
    latitude: 28.5462,
    longitude: 77.1941,
    capacity: 2,
    difficulty: 3,
    active: true,
    routeGroup: "north",
    occupancy: 0,
    approaching: 0,
    recentVisits: 0,
    visitedByTeam: false,
    allowedNext: true,
    ...over,
  };
}

const base = {
  from: FROM,
  visitedCount: 1,
  totalCheckpoints: 8,
  config: ROUTING_CONFIG,
  random: () => 0, // no jitter, deterministic
};

test("haversine measures real campus distances", () => {
  const d = haversine(FROM, { latitude: 28.5462, longitude: 77.1941 });
  assert.ok(d > 150 && d < 250, `expected ~200m, got ${Math.round(d)}m`);
  assert.equal(Math.round(haversine(FROM, FROM)), 0);
});

test("returns null when there is nowhere to go", () => {
  assert.equal(chooseNextCheckpoint({ ...base, candidates: [] }), null);
  assert.equal(
    chooseNextCheckpoint({ ...base, candidates: [candidate({ id: "a", active: false })] }),
    null,
  );
});

test("skips checkpoints the team already completed", () => {
  const decision = chooseNextCheckpoint({
    ...base,
    candidates: [
      candidate({ id: "visited", visitedByTeam: true }),
      candidate({ id: "fresh", latitude: 28.5463, longitude: 77.1942 }),
    ],
  });
  assert.equal(decision?.checkpointId, "fresh");
});

test("falls back to a visited checkpoint rather than dead-ending", () => {
  const decision = chooseNextCheckpoint({
    ...base,
    candidates: [candidate({ id: "only", visitedByTeam: true })],
  });
  assert.equal(decision?.checkpointId, "only");
});

test("avoids a checkpoint that already has teams approaching", () => {
  const decision = chooseNextCheckpoint({
    ...base,
    candidates: [
      candidate({ id: "busy", approaching: 2 }),
      candidate({ id: "quiet" }),
    ],
  });
  assert.equal(decision?.checkpointId, "quiet");
  assert.ok(decision!.reason.some((r) => r.includes("capacity")));
});

test("avoids a checkpoint that is at capacity", () => {
  const decision = chooseNextCheckpoint({
    ...base,
    candidates: [
      candidate({ id: "full", occupancy: 2, capacity: 2 }),
      candidate({ id: "open", occupancy: 0, capacity: 2 }),
    ],
  });
  assert.equal(decision?.checkpointId, "open");
});

test("prefers an allowed next checkpoint over an unlisted one", () => {
  const decision = chooseNextCheckpoint({
    ...base,
    candidates: [
      candidate({ id: "unlisted", allowedNext: false }),
      candidate({ id: "listed", allowedNext: true }),
    ],
  });
  assert.equal(decision?.checkpointId, "listed");
});

test("penalises checkpoints visited recently by other teams", () => {
  const decision = chooseNextCheckpoint({
    ...base,
    candidates: [
      candidate({ id: "hot", recentVisits: 5 }),
      candidate({ id: "cold", recentVisits: 0 }),
    ],
  });
  assert.equal(decision?.checkpointId, "cold");
});

test("spreads two teams that finish the same checkpoint at the same moment", () => {
  // Two equally good destinations. Team A is routed first, which creates a
  // soft reservation; team B must then be sent somewhere else.
  const candidates = () => [
    candidate({ id: "cp7", latitude: 28.5462, longitude: 77.1941 }),
    candidate({ id: "cp9", latitude: 28.546, longitude: 77.1943 }),
  ];

  const teamA = chooseNextCheckpoint({ ...base, candidates: candidates() })!;

  const forB = candidates().map((c) =>
    c.id === teamA.checkpointId ? { ...c, approaching: 1 } : c,
  );
  const teamB = chooseNextCheckpoint({ ...base, candidates: forB })!;

  assert.notEqual(teamB.checkpointId, teamA.checkpointId);
});

test("estimated travel time follows distance and walking speed", () => {
  const decision = chooseNextCheckpoint({
    ...base,
    candidates: [candidate({ id: "a" })],
  })!;
  const expected = Math.round(decision.distanceMeters / ROUTING_CONFIG.walkingSpeedMps);
  assert.equal(decision.estimatedTravelTime, expected);
  assert.ok(decision.reason.length > 0);
});

test("weights are honoured: zeroing congestion stops avoidance", () => {
  const cfg = { ...ROUTING_CONFIG, congestionWeight: 0, capacityWeight: 0, approachingWeight: 0 };
  const candidates = [
    // Busy but a better difficulty fit than the alternative.
    candidate({ id: "busy", occupancy: 3, difficulty: 2 }),
    candidate({ id: "quiet", difficulty: 5 }),
  ];
  assert.equal(chooseNextCheckpoint({ ...base, candidates })?.checkpointId, "quiet");
  assert.equal(
    chooseNextCheckpoint({ ...base, candidates, config: cfg })?.checkpointId,
    "busy",
  );
});
