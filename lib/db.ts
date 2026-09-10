import { PrismaClient } from "@prisma/client";
import { resolveDatabaseEnv } from "./db-env";

// Map integration-provided POSTGRES_* variables before the client reads them.
resolveDatabaseEnv();

// ponytail: single client reused across hot reloads and serverless invocations.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
