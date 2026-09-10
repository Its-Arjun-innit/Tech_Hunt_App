import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { CredentialsSheet } from "@/components/admin/credentials-sheet";

export const dynamic = "force-dynamic";

export default async function CredentialsPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  const players = await prisma.player.findMany({
    where: { team: { gameId: game.id } },
    include: { team: { select: { name: true } } },
    orderBy: [{ team: { name: "asc" } }, { memberCode: "asc" }],
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Player credentials</h1>
        <p className="text-muted-foreground text-sm">
          PINs are stored hashed and cannot be read back. Reset an individual PIN from the teams
          page, or issue a fresh set for everyone below.
        </p>
      </div>

      <CredentialsSheet
        gameName={game.name}
        players={players.map((p) => ({
          teamName: p.team.name,
          memberName: p.name,
          memberCode: p.memberCode,
        }))}
      />
    </div>
  );
}
