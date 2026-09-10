import Link from "next/link";
import { Flag, Plus, QrCode } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { getCheckpointTraffic, TRAFFIC_CLASS, TRAFFIC_LABEL } from "@/lib/routing/traffic";
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

      <div className="space-y-2">
        {checkpoints.map((cp) => {
          const t = traffic.get(cp.id);
          const state = t?.state ?? "GREEN";
          return (
            <Link
              key={cp.id}
              href={`/admin/checkpoints/${cp.id}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 outline-none transition-colors hover:bg-muted/50 hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TRAFFIC_CLASS[state]}`}
              >
                {TRAFFIC_LABEL[state]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{cp.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {cp.points} pts · capacity {cp.capacity} · difficulty {cp.difficulty}
                  {cp.routeGroup && ` · ${cp.routeGroup}`}
                  {cp.challenge && ` · ${cp.challenge.type.replace("_", " ")}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {cp._count.clues} clue{cp._count.clues === 1 ? "" : "s"} ·{" "}
                {cp._count.routesFrom} route{cp._count.routesFrom === 1 ? "" : "s"} ·{" "}
                {cp._count.scanEvents} scans
              </span>
              {t && (t.occupancy > 0 || t.approaching > 0) && (
                <span className="text-xs text-muted-foreground">
                  {t.occupancy} here / {t.approaching} coming
                </span>
              )}
            </Link>
          );
        })}
        {checkpoints.length === 0 && (
          <EmptyState
            icon={Flag}
            title="No checkpoints yet"
            description="A checkpoint is a physical place with a QR poster. Add your first one below, then set its clues and possible next destinations."
          />
        )}
      </div>

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
