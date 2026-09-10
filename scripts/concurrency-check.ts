/**
 * Two members of the same team scanning the same checkpoint at the same
 * instant must score exactly once. Run against a seeded dev database:
 *   npx tsx scripts/concurrency-check.ts
 */
import { PrismaClient } from "@prisma/client";
import { processScan } from "../lib/game-engine/process-scan";

const prisma = new PrismaClient();

async function main() {
  const team = await prisma.team.findFirst({
    where: { name: "Team Gamma" },
    include: { players: true, game: true },
  });
  if (!team || team.players.length < 2) throw new Error("Seed the demo game first.");

  // Send the team somewhere known, then have both members scan it at once.
  const target = await prisma.checkpoint.findFirst({
    where: { gameId: team.gameId, scanEvents: { none: { teamId: team.id, result: "SUCCESS" } } },
  });
  if (!target) throw new Error("No unvisited checkpoint left.");

  await prisma.routingAssignment.updateMany({
    where: { teamId: team.id, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });
  await prisma.routingAssignment.create({
    data: {
      teamId: team.id,
      checkpointId: target.id,
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });

  const before = await prisma.team.findUniqueOrThrow({ where: { id: team.id } });

  const results = await Promise.allSettled(
    team.players.slice(0, 2).map((p) =>
      processScan({
        playerId: p.id,
        teamId: team.id,
        gameId: team.gameId,
        qrToken: target.qrToken,
      }),
    ),
  );

  const after = await prisma.team.findUniqueOrThrow({ where: { id: team.id } });
  const scoreEvents = await prisma.scoreEvent.count({
    where: { teamId: team.id, type: "CHECKPOINT", refId: target.id },
  });
  const successScans = await prisma.scanEvent.count({
    where: { teamId: team.id, checkpointId: target.id, result: "SUCCESS" },
  });

  console.log(`checkpoint        ${target.name} (${target.points} pts)`);
  console.log(`outcomes          ${results.map(describe).join(", ")}`);
  console.log(`score events      ${scoreEvents}`);
  console.log(`successful scans  ${successScans}`);
  console.log(`score change      ${before.score} -> ${after.score}`);

  const ok =
    scoreEvents === 1 && successScans === 1 && after.score - before.score === target.points;
  console.log(ok ? "\nPASS: scored exactly once." : "\nFAIL: double scoring detected.");
  process.exitCode = ok ? 0 : 1;
}

function describe(r: PromiseSettledResult<{ ok: boolean } & Record<string, unknown>>) {
  if (r.status === "rejected") return "error(serialized)";
  return r.value.ok ? "success" : `rejected(${r.value.result})`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
