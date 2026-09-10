import { test } from "node:test";
import assert from "node:assert/strict";
import { appUrl, extractToken, generatePin, generateQrToken } from "./token";

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

test("a scan URL round-trips back to its token", () => {
  withEnv({ APP_URL: "https://hunt.example.edu" }, () => {
    const token = generateQrToken();
    assert.match(token, /^cp_[a-z0-9]{10}$/);
    assert.equal(extractToken(`https://hunt.example.edu/scan/${token}`), token);
    assert.equal(extractToken(token), token);
    assert.equal(extractToken("https://example.com/not-a-scan"), null);
  });
});

test("generated PINs are always six digits", () => {
  for (let i = 0; i < 200; i++) assert.match(generatePin(), /^\d{6}$/);
});
