import { test } from "node:test";
import assert from "node:assert/strict";
import { isActiveNav } from "./nav";

test("the overview matches only itself", () => {
  assert.ok(isActiveNav("/admin", "/admin"));
  assert.ok(!isActiveNav("/admin/students", "/admin"));
  assert.ok(!isActiveNav("/admin/courses/abc123", "/admin"));
});

test("a section stays active on its nested routes", () => {
  assert.ok(isActiveNav("/admin/courses", "/admin/courses"));
  assert.ok(isActiveNav("/admin/courses/abc123", "/admin/courses"));
  assert.ok(isActiveNav("/admin/students/import", "/admin/students"));
});

test("a sibling with a shared prefix does not match", () => {
  // A shared prefix must not light up the wrong item.
  assert.ok(!isActiveNav("/admin/courses-old", "/admin/courses"));
  assert.ok(!isActiveNav("/admin/students-archive", "/admin/students"));
});

test("trailing slashes do not change the result", () => {
  assert.ok(isActiveNav("/admin/", "/admin"));
  assert.ok(isActiveNav("/admin/courses/", "/admin/courses"));
  assert.ok(!isActiveNav("/admin/students/", "/admin"));
});
