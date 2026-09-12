import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleToStaff, visibleToTeam } from "./announcements";

const NOW = new Date("2026-06-01T12:00:00Z");
const EARLIER = new Date("2026-06-01T11:00:00Z");
const LATER = new Date("2026-06-01T13:00:00Z");

const make = (over: Partial<Parameters<typeof visibleToTeam>[0]> = {}) => ({
  audience: "ALL_TEAMS" as const,
  teamIds: [] as string[],
  scheduledFor: null as Date | null,
  ...over,
});

test("a broadcast reaches every team", () => {
  assert.ok(visibleToTeam(make(), "team-1", NOW));
  assert.ok(visibleToTeam(make(), "team-2", NOW));
});

test("a targeted announcement reaches only the listed teams", () => {
  const a = make({ audience: "SELECTED_TEAMS", teamIds: ["team-1"] });
  assert.ok(visibleToTeam(a, "team-1", NOW));
  assert.ok(!visibleToTeam(a, "team-2", NOW));
});

test("staff announcements never reach players", () => {
  for (const audience of ["VOLUNTEERS", "ADMINS"] as const) {
    assert.ok(!visibleToTeam(make({ audience }), "team-1", NOW));
  }
});

test("team announcements never show up as staff notices", () => {
  assert.ok(!visibleToStaff(make(), "VOLUNTEER", NOW));
  assert.ok(!visibleToStaff(make({ audience: "SELECTED_TEAMS" }), "GAME_ADMIN", NOW));
});

test("volunteer and admin notices go to the right staff", () => {
  const volunteers = make({ audience: "VOLUNTEERS" });
  assert.ok(visibleToStaff(volunteers, "VOLUNTEER", NOW));
  assert.ok(!visibleToStaff(volunteers, "GAME_ADMIN", NOW));

  const admins = make({ audience: "ADMINS" });
  assert.ok(visibleToStaff(admins, "GAME_ADMIN", NOW));
  assert.ok(visibleToStaff(admins, "SUPER_ADMIN", NOW));
  assert.ok(!visibleToStaff(admins, "VOLUNTEER", NOW));
});

test("a future announcement stays hidden until its time passes", () => {
  const scheduled = make({ scheduledFor: LATER });
  assert.ok(!visibleToTeam(scheduled, "team-1", NOW));
  assert.ok(visibleToTeam(scheduled, "team-1", LATER));

  const past = make({ scheduledFor: EARLIER });
  assert.ok(visibleToTeam(past, "team-1", NOW));
});

test("scheduling gates staff notices too", () => {
  const a = make({ audience: "VOLUNTEERS", scheduledFor: LATER });
  assert.ok(!visibleToStaff(a, "VOLUNTEER", NOW));
  assert.ok(visibleToStaff(a, "VOLUNTEER", LATER));
});
