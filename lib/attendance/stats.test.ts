import { test } from "node:test";
import assert from "node:assert/strict";
import { standing, standingSentence } from "./stats";

test("exactly at the minimum: nothing to spare, nothing owed", () => {
  const s = standing(3, 4, 75);
  assert.equal(s.pct, 75);
  assert.equal(s.canMiss, 0);
  assert.equal(s.mustAttend, 0);
  assert.equal(s.below, false);
  assert.equal(standingSentence(s), "Don't miss the next class");
});

test("above the minimum: how many can be missed", () => {
  // 18/20 = 90%. 18/24 = 75%, 18/25 = 72% → can miss 4.
  assert.equal(standing(18, 20, 75).canMiss, 4);
});

test("below the minimum: how many in a row to recover", () => {
  // 5/10 = 50%. (5+n)/(10+n) >= .75 → n = 10.
  const s = standing(5, 10, 75);
  assert.equal(s.mustAttend, 10);
  assert.equal(s.below, true);
  assert.equal(standingSentence(s), "Attend the next 10 to get back on track");
});

test("percentage rounds down so 74.9% is not shown as 75%", () => {
  assert.equal(standing(749, 1000, 75).pct, 74);
  assert.equal(standing(749, 1000, 75).below, true);
});

test("nothing held yet", () => {
  const s = standing(0, 0, 75);
  assert.equal(s.pct, null);
  assert.equal(s.below, false);
  assert.equal(standingSentence(s), "No classes held yet");
});

test("a 100% minimum can never be recovered once missed", () => {
  assert.equal(standing(9, 10, 100).mustAttend, Infinity);
});
