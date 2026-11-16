import { test } from "node:test";
import assert from "node:assert/strict";
import { canPost } from "./notices";

const teacher = { role: "TEACHER" as const, departmentId: "cse" };
const hod = { role: "HOD" as const, departmentId: "cse" };
const admin = { role: "ADMIN" as const, departmentId: null };

test("teacher posts only to sections they teach", () => {
  assert.equal(canPost(teacher, "SECTION", "A", ["A"]), true);
  assert.equal(canPost(teacher, "SECTION", "B", ["A"]), false);
  assert.equal(canPost(teacher, "DEPARTMENT", "cse", ["A"]), false);
  assert.equal(canPost(teacher, "ALL", null, ["A"]), false);
});

test("HOD reaches their own department, not another", () => {
  assert.equal(canPost(hod, "DEPARTMENT", "cse", []), true);
  assert.equal(canPost(hod, "DEPARTMENT", "ece", []), false);
  assert.equal(canPost(hod, "ALL", null, []), false);
});

test("admin reaches everyone", () => {
  assert.equal(canPost(admin, "ALL", null, []), true);
});
