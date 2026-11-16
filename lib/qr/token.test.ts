import { test } from "node:test";
import assert from "node:assert/strict";
import { appUrl, attendanceUrl, generateAttendanceToken, generatePin } from "./token";
import { parseScan } from "./parse";

const KEYS = ["APP_URL", "NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;

function withEnv(values: Partial<Record<(typeof KEYS)[number], string>>, fn: () => void) {
  const saved = KEYS.map((k) => [k, process.env[k]] as const);
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(values)) process.env[k] = v;
  try {
    fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("an explicit origin wins and loses its trailing slash", () => {
  withEnv({ APP_URL: "https://hunt.example.edu/" }, () => {
    assert.equal(appUrl(), "https://hunt.example.edu");
  });
});

test("the public variable still works for existing setups", () => {
  withEnv({ NEXT_PUBLIC_APP_URL: "https://hunt.example.edu" }, () => {
    assert.equal(appUrl(), "https://hunt.example.edu");
  });
});

test("falls back to the Vercel production URL, adding the scheme", () => {
  withEnv({ VERCEL_PROJECT_PRODUCTION_URL: "tech-hunt-app.vercel.app" }, () => {
    assert.equal(appUrl(), "https://tech-hunt-app.vercel.app");
  });
});

test("a Vercel value that already carries a scheme is not doubled", () => {
  withEnv({ VERCEL_PROJECT_PRODUCTION_URL: "https://tech-hunt-app.vercel.app" }, () => {
    assert.equal(appUrl(), "https://tech-hunt-app.vercel.app");
  });
});

test("an empty configured value does not beat the Vercel fallback", () => {
  withEnv({ APP_URL: "", VERCEL_PROJECT_PRODUCTION_URL: "tech-hunt-app.vercel.app" }, () => {
    assert.equal(appUrl(), "https://tech-hunt-app.vercel.app");
  });
});

test("falls back to localhost when nothing is configured", () => {
  withEnv({}, () => assert.equal(appUrl(), "http://localhost:3000"));
});

test("an attendance URL round-trips to its token and code", () => {
  const token = generateAttendanceToken();
  assert.match(token, /^at_[a-z0-9]{10}$/);
  assert.deepEqual(parseScan(attendanceUrl(token, "042917", "https://campus.example.edu")), {
    token,
    code: "042917",
  });
});

test("a bare typed code parses without a token; anything else is null", () => {
  assert.deepEqual(parseScan("042 917"), { token: null, code: "042917" });
  assert.equal(parseScan("https://example.com/menu"), null);
  assert.equal(parseScan("12345"), null);
});

test("PINs are six digits", () => {
  for (let i = 0; i < 50; i++) assert.match(generatePin(), /^\d{6}$/);
});
