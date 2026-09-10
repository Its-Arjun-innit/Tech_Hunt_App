/**
 * Accepts the connection variables that hosting integrations inject.
 *
 * Vercel's Supabase and Neon integrations write POSTGRES_* names rather than
 * the DATABASE_URL Prisma reads, so without this an otherwise correct setup
 * looks like an empty database URL. Anything set explicitly always wins.
 *
 * Must run before the first PrismaClient is constructed, since Prisma reads
 * these variables at construction time.
 */
const POOLED = ["POSTGRES_PRISMA_URL", "POSTGRES_URL", "DATABASE_URL_POOLED"];
const DIRECT = ["POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED", "POSTGRES_URL"];

function firstValue(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export function resolveDatabaseEnv() {
  if (!process.env.DATABASE_URL) {
    const pooled = firstValue(POOLED);
    if (pooled) process.env.DATABASE_URL = pooled;
  }
  // Only migrations need a direct connection; the running app does not.
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = firstValue(DIRECT) ?? process.env.DATABASE_URL ?? "";
  }
  return {
    databaseUrl: process.env.DATABASE_URL ?? "",
    directUrl: process.env.DIRECT_URL ?? "",
  };
}
