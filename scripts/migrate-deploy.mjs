/**
 * Applies pending migrations during the Vercel build.
 *
 * Wrapping the Prisma CLI in Node rather than chaining shell variables keeps
 * the behaviour identical across the different shells npm may use, and lets
 * the build report which connection variables it can actually see without
 * ever printing their values.
 *
 * Mirrors lib/db-env.ts, which cannot be imported here because this runs
 * before the TypeScript build.
 */
import { spawnSync } from "node:child_process";

const POOLED = ["POSTGRES_PRISMA_URL", "POSTGRES_URL", "DATABASE_URL_POOLED"];
const DIRECT = ["POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED", "POSTGRES_URL"];

const firstValue = (names) => names.map((n) => process.env[n]).find(Boolean);

const describe = (name) => {
  const value = process.env[name];
  if (value === undefined) return `${name}: not set`;
  if (value === "") return `${name}: set but empty`;
  return `${name}: set, ${value.length} chars, scheme ${value.split("://")[0]}`;
};

console.log("[migrate] " + describe("DATABASE_URL"));
console.log("[migrate] " + describe("DIRECT_URL"));

if (!process.env.DATABASE_URL) {
  const pooled = firstValue(POOLED);
  if (pooled) {
    process.env.DATABASE_URL = pooled;
    console.log("[migrate] DATABASE_URL taken from an integration variable.");
  }
}

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = firstValue(DIRECT) ?? process.env.DATABASE_URL ?? "";
  if (process.env.DIRECT_URL) {
    console.log("[migrate] DIRECT_URL was empty, using a direct or pooled fallback.");
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    "[migrate] No database connection string is available to the build.\n" +
      "[migrate] Set DATABASE_URL in the project's environment variables, or\n" +
      "[migrate] attach a Postgres database from the project's Storage tab.",
  );
  process.exit(1);
}

if (process.env.DATABASE_URL.startsWith("prisma+postgres://")) {
  console.error(
    "[migrate] DATABASE_URL is a Prisma Postgres URL, which needs the Accelerate\n" +
      "[migrate] extension this app does not use. Use a plain postgresql:// string.",
  );
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
