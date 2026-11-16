import { test } from "node:test";
import assert from "node:assert/strict";
import { WINDOW_MS, currentCode, verifyCode } from "./code";

const secret = "test-secret";
const t0 = 1_800_000_000_000; // start of a window

test("code is six digits and stable within a window", () => {
  const a = currentCode(secret, t0).code;
  assert.match(a, /^\d{6}$/);
  assert.equal(currentCode(secret, t0 + WINDOW_MS - 1).code, a);
  assert.equal(currentCode(secret, t0 + 5_000).msLeft, WINDOW_MS - 5_000);
});

test("current and previous window accepted, older rejected", () => {
  const { code } = currentCode(secret, t0);
  assert.equal(verifyCode(secret, code, t0), true);
  assert.equal(verifyCode(secret, code, t0 + WINDOW_MS), true);
  assert.equal(verifyCode(secret, code, t0 + 2 * WINDOW_MS), false);
});

test("a future code is not accepted early", () => {
  const next = currentCode(secret, t0 + WINDOW_MS).code;
  // Codes can collide by chance; only assert when they differ.
  if (next !== currentCode(secret, t0).code) assert.equal(verifyCode(secret, next, t0), false);
});

test("another session's secret does not verify", () => {
  const { code } = currentCode(secret, t0);
  assert.equal(verifyCode("other", code, t0), code === currentCode("other", t0).code);
});

test("spaces and dashes in typed codes are ignored; wrong length rejected", () => {
  const { code } = currentCode(secret, t0);
  assert.equal(verifyCode(secret, `${code.slice(0, 3)} ${code.slice(3)}`, t0), true);
  assert.equal(verifyCode(secret, code.slice(0, 5), t0), false);
});
