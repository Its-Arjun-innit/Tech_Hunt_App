import "server-only";
import { prisma } from "@/lib/db";

/** The single settings row, created with defaults on first read. */
export async function getSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
