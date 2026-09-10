/**
 * Applies pending migrations during the Vercel build.
 *
 * Wrapping the Prisma CLI in Node rather than chaining shell variables keeps
 * the behaviour identical across the different shells npm may use, and lets
 * the build report which connection variables it can actually see without
 * ever printing their values.
 */
import { spawnSync } from "node:child_process";

const describe = (name) => {
  const value = process.env[name];
  if (value === undefined) return `${name}: not set`;
  if (value === "") return `${name}: set but empty`;
  const scheme = value.split("://")[0];
  return `${name}: set, ${value.length} chars, scheme ${scheme}`;
};

console.log("[migrate] " + describe("DATABASE_URL"));
console.log("[migrate] " + describe("DIRECT_URL"));

// Only migrations need a direct connection; the running app does not.
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  console.log("[migrate] DIRECT_URL was empty, falling back to DATABASE_URL.");
}

if (!process.env.DATABASE_URL) {
  console.error(
    "[migrate] DATABASE_URL is not available to the build. Add it to the " +
      "project's environment variables for this environment, then redeploy.",
  );
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
