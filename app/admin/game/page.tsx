import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { resolveRoutingConfig, ROUTING_CONFIG } from "@/lib/routing/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameControls } from "@/components/admin/game-controls";
import { GameSettingsForm } from "@/components/admin/game-settings-form";
import { RoutingWeightsForm } from "@/components/admin/routing-weights-form";
import { GamePicker } from "@/components/admin/game-picker";

export const dynamic = "force-dynamic";

export default async function GameAdminPage() {
  await requireAdmin();
  const [game, games] = await Promise.all([
    getCurrentGame(),
    prisma.game.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true } }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Game controls</h1>
        <p className="text-muted-foreground text-sm">
          Start, pause and configure the hunt.
        </p>
      </div>

      <GamePicker games={games} currentId={game?.id ?? null} />

      {game && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status: {game.status}</CardTitle>
            </CardHeader>
            <CardContent>
              <GameControls status={game.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <GameSettingsForm
                game={{
                  name: game.name,
                  startsAt: game.startsAt?.toISOString() ?? null,
                  endsAt: game.endsAt?.toISOString() ?? null,
                  scoringFrozen: game.scoringFrozen,
                  scansLocked: game.scansLocked,
                  enforceRouting: game.enforceRouting,
                  leaderboardDelaySeconds: game.leaderboardDelaySeconds,
                  clueUnlockMode: game.clueUnlockMode,
                  clueUnlockAfterSeconds: game.clueUnlockAfterSeconds,
                  clueRequestCost: game.clueRequestCost,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Routing weights</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tune how the engine spreads teams. Higher congestion and approaching weights
                push teams further apart.
              </p>
            </CardHeader>
            <CardContent>
              <RoutingWeightsForm
                values={resolveRoutingConfig(game.routingConfig)}
                defaults={ROUTING_CONFIG}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
