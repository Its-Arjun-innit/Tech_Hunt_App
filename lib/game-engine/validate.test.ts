import { test } from "node:test";
import assert from "node:assert/strict";
import { validateScan, type ScanInput } from "./validate";

/** A scan that should succeed, so each test can spoil exactly one thing. */
const ok = (over: Partial<ScanInput> = {}): ScanInput => ({
  gameActive: true,
  gameScansLocked: false,
  gameScoringFrozen: false,
  teamActive: true,
  checkpointExists: true,
  checkpointActive: true,
  checkpointPoints: 50,
  recentScanCount: 0,
  ...over,
});

test("a clean scan is accepted and worth the checkpoint's points", () => {
  assert.deepEqual(validateScan(ok()), { ok: true, pointsAwarded: 50 });
});

test("a frozen scoreboard still lets the scan through, worth nothing", () => {
  assert.deepEqual(validateScan(ok({ gameScoringFrozen: true })), {
    ok: true,
    pointsAwarded: 0,
  });
});

test("each failure reports its own reason", () => {
  const cases: [Partial<ScanInput>, string][] = [
    [{ recentScanCount: 10 }, "RATE_LIMITED"],
    [{ checkpointExists: false }, "INVALID_TOKEN"],
    [{ gameActive: false }, "GAME_NOT_ACTIVE"],
    [{ gameScansLocked: true }, "GAME_NOT_ACTIVE"],
    [{ teamActive: false }, "TEAM_DISABLED"],
    [{ checkpointActive: false }, "INACTIVE_CHECKPOINT"],
  ];
  for (const [over, expected] of cases) {
    assert.deepEqual(validateScan(ok(over)), { ok: false, result: expected });
  }
});

test("the rate limit is a floor, not a ceiling", () => {
  assert.equal(validateScan(ok({ recentScanCount: 9 })).ok, true);
  assert.equal(validateScan(ok({ recentScanCount: 10 })).ok, false);
  assert.equal(validateScan(ok({ recentScanCount: 3 }), 3).ok, false);
});

/**
 * Order matters: a player hammering the button is turned away before the token
 * is looked at, so a flood of scans cannot be used to probe which QR codes are
 * real.
 */
test("rate limiting is decided before anything else", () => {
  const everythingWrong = ok({
    recentScanCount: 10,
    checkpointExists: false,
    gameActive: false,
    teamActive: false,
    checkpointActive: false,
  });
  assert.deepEqual(validateScan(everythingWrong), {
    ok: false,
    result: "RATE_LIMITED",
  });
});

test("an unknown token is reported before the game and team are judged", () => {
  const result = validateScan(
    ok({ checkpointExists: false, gameActive: false, teamActive: false }),
  );
  assert.deepEqual(result, { ok: false, result: "INVALID_TOKEN" });
});
