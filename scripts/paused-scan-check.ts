/** Scanning must be rejected while the game is paused. */
import { PrismaClient } from "@prisma/client";
import { processScan } from "../lib/game-engine/process-scan";

const prisma = new PrismaClient();

async function main() {
  const team = await prisma.team.findFirstOrThrow({
    where: { name: "Team Alpha" },
    include: { players: true, game: true },
  });
  const cp = await prisma.checkpoint.findFirstOrThrow({ where: { name: "Canteen Courtyard" } });

  // A freshly seeded game is ACTIVE, so pause it here rather than expecting
  // whoever runs this to have paused it by hand, and put it back afterwards.
  const wasStatus = team.game.status;
  await prisma.game.update({ where: { id: team.gameId }, data: { status: "PAUSED" } });

  try {
    const result = await processScan({
      playerId: team.players[0].id,
      teamId: team.id,
      gameId: team.gameId,
      qrToken: cp.qrToken,
    });

    console.log(`game status  PAUSED (was ${wasStatus})`);
    console.log(`outcome      ${JSON.stringify(result)}`);

    const ok = !result.ok && result.result === "GAME_NOT_ACTIVE";
    console.log(ok ? "\nPASS: paused game rejects scans." : "\nFAIL: scan was accepted.");
    process.exitCode = ok ? 0 : 1;
  } finally {
    await prisma.game.update({ where: { id: team.gameId }, data: { status: wasStatus } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
