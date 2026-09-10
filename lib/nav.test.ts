import { test } from "node:test";
import assert from "node:assert/strict";
import { isActiveNav } from "./nav";

test("the overview matches only itself", () => {
  assert.ok(isActiveNav("/admin", "/admin"));
  assert.ok(!isActiveNav("/admin/teams", "/admin"));
  assert.ok(!isActiveNav("/admin/checkpoints/abc123", "/admin"));
});

test("a section stays active on its nested routes", () => {
  assert.ok(isActiveNav("/admin/checkpoints", "/admin/checkpoints"));
  assert.ok(isActiveNav("/admin/checkpoints/abc123", "/admin/checkpoints"));
  assert.ok(isActiveNav("/admin/teams/import", "/admin/teams"));
});

test("a sibling with a shared prefix does not match", () => {
  // /admin/challenges must not light up Checkpoints.
  assert.ok(!isActiveNav("/admin/challenges", "/admin/checkpoints"));
  assert.ok(!isActiveNav("/admin/teams-archive", "/admin/teams"));
});

test("trailing slashes do not change the result", () => {
  assert.ok(isActiveNav("/admin/", "/admin"));
  assert.ok(isActiveNav("/admin/checkpoints/", "/admin/checkpoints"));
  assert.ok(!isActiveNav("/admin/teams/", "/admin"));
});
