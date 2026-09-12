import Link from "next/link";
import { Flag, Plus, QrCode } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { getCheckpointTraffic } from "@/lib/routing/traffic";
import { CheckpointsTable } from "@/components/admin/checkpoints-table";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckpointForm } from "@/components/admin/checkpoint-form";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";

export default async function CheckpointsPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  const [checkpoints, traffic] = await Promise.all([
    prisma.checkpoint.findMany({
      where: { gameId: game.id },
      include: {
        _count: { select: { clues: true, routesFrom: true, scanEvents: true } },
        challenge: { select: { type: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getCheckpointTraffic(game.id),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Checkpoints"
        description={`${checkpoints.length} checkpoint${checkpoints.length === 1 ? "" : "s"}`}
        actions={
          <>
            <AutoRefresh seconds={10} showIndicator />
            <Button variant="outline" render={<Link href="/admin/qr" />}>
              <QrCode className="size-4" /> QR posters
            </Button>
          </>
        }
      />

      {checkpoints.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No checkpoints yet"
          description="A checkpoint is a physical place with a QR poster. Add your first one below, then set its clues and possible next destinations."
        />
      ) : (
        <CheckpointsTable
          rows={checkpoints.map((cp) => {
            const t = traffic.get(cp.id);
            return {
              id: cp.id,
              name: cp.name,
              routeGroup: cp.routeGroup,
              points: cp.points,
              capacity: cp.capacity,
              difficulty: cp.difficulty,
              active: cp.active,
              clues: cp._count.clues,
              routes: cp._count.routesFrom,
              scans: cp._count.scanEvents,
              challenge: cp.challenge?.type ?? null,
              state: t?.state ?? "GREEN",
              occupancy: t?.occupancy ?? 0,
              approaching: t?.approaching ?? 0,
            };
          })}
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="size-4" /> Add a checkpoint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CheckpointForm
            mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
            others={checkpoints.map((c) => ({
              id: c.id,
              name: c.name,
              latitude: c.latitude,
              longitude: c.longitude,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
