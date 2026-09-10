import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { haversine } from "@/lib/routing/engine";
import { scanUrl } from "@/lib/qr/token";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckpointForm } from "@/components/admin/checkpoint-form";
import { RoutesEditor } from "@/components/admin/routes-editor";
import { CluesEditor } from "@/components/admin/clues-editor";
import { ChallengeEditor } from "@/components/admin/challenge-editor";
import { QrPanel } from "@/components/admin/qr-panel";
import { CheckpointDangerZone } from "@/components/admin/checkpoint-danger-zone";

export const dynamic = "force-dynamic";

export default async function CheckpointEditorPage({
  params,
}: PageProps<"/admin/checkpoints/[id]">) {
  const { id } = await params;
  await requireAdmin();

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id },
    include: {
      clues: { orderBy: { level: "asc" } },
      challenge: true,
      routesFrom: { select: { toId: true } },
    },
  });
  if (!checkpoint) notFound();

  const others = await prisma.checkpoint.findMany({
    where: { gameId: checkpoint.gameId, id: { not: checkpoint.id } },
    select: { id: true, name: true, latitude: true, longitude: true, active: true },
    orderBy: { name: "asc" },
  });

  const selected = new Set(checkpoint.routesFrom.map((r) => r.toId));
  const destinations = others
    .map((o) => ({
      id: o.id,
      name: o.name,
      active: o.active,
      distance: Math.round(haversine(checkpoint, o)),
      selected: selected.has(o.id),
    }))
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="space-y-6 max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2.5"
        render={<Link href="/admin/checkpoints" />}
      >
        <ArrowLeft className="size-4" /> Checkpoints
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{checkpoint.name}</h1>
          <p className="text-muted-foreground text-sm font-mono">{checkpoint.qrToken}</p>
        </div>
        <Badge variant={checkpoint.active ? "secondary" : "outline"}>
          {checkpoint.active ? "Active" : "Disabled"}
        </Badge>
      </div>

      {/* Five stacked cards made this page a very long scroll, and the parts
          are edited independently, so they belong behind tabs. */}
      <Tabs defaultValue="location">
        <TabsList className="flex-wrap">
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="routes">
            Routes
            <Badge variant="outline" className="ml-1.5 text-[10px] font-normal">
              {destinations.filter((d) => d.selected).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="clues">
            Clues
            <Badge variant="outline" className="ml-1.5 text-[10px] font-normal">
              {checkpoint.clues.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="challenge">
            Challenge
            {checkpoint.challenge && (
              <span className="ml-1.5 size-1.5 rounded-full bg-emerald-500" aria-hidden />
            )}
          </TabsTrigger>
          <TabsTrigger value="qr">QR code</TabsTrigger>
        </TabsList>

        <TabsContent value="location" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Location & scoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckpointForm
                mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
                others={others}
                initial={{
                  id: checkpoint.id,
                  name: checkpoint.name,
                  description: checkpoint.description ?? "",
                  latitude: checkpoint.latitude,
                  longitude: checkpoint.longitude,
                  points: checkpoint.points,
                  capacity: checkpoint.capacity,
                  difficulty: checkpoint.difficulty,
                  routeGroup: checkpoint.routeGroup ?? "",
                  active: checkpoint.active,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Possible next checkpoints</CardTitle>
              <p className="text-sm text-muted-foreground">
                The routing engine picks one of these based on live conditions. Leave all
                unchecked to let the engine consider every checkpoint.
              </p>
            </CardHeader>
            <CardContent>
              <RoutesEditor checkpointId={checkpoint.id} destinations={destinations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clues" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Clues to reach here</CardTitle>
              <p className="text-sm text-muted-foreground">
                Level 1 is cryptic, the last level is a direct instruction. Teams routed here
                see these clues.
              </p>
            </CardHeader>
            <CardContent>
              <CluesEditor
                checkpointId={checkpoint.id}
                clues={checkpoint.clues.map((c) => c.text)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenge" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Challenge</CardTitle>
              <p className="text-sm text-muted-foreground">
                Optional. While active, teams must finish it before their next clue.
              </p>
            </CardHeader>
            <CardContent>
              <ChallengeEditor
                checkpointId={checkpoint.id}
                challenge={
                  checkpoint.challenge
                    ? {
                        type: checkpoint.challenge.type,
                        title: checkpoint.challenge.title,
                        prompt: checkpoint.challenge.prompt,
                        points: checkpoint.challenge.points,
                        maxAttempts: checkpoint.challenge.maxAttempts,
                        penaltyPoints: checkpoint.challenge.penaltyPoints,
                        timeLimitSeconds: checkpoint.challenge.timeLimitSeconds,
                        active: checkpoint.challenge.active,
                        config: JSON.stringify(checkpoint.challenge.config, null, 2),
                      }
                    : null
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="pt-4 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">QR code</CardTitle>
            </CardHeader>
            <CardContent>
              <QrPanel
                checkpointId={checkpoint.id}
                name={checkpoint.name}
                url={scanUrl(checkpoint.qrToken)}
              />
            </CardContent>
          </Card>

          <CheckpointDangerZone checkpointId={checkpoint.id} active={checkpoint.active} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
