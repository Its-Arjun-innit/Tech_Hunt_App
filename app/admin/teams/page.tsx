import Link from "next/link";
import { Printer, Upload } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTeamForm } from "@/components/admin/create-team-form";
import { TeamRow } from "@/components/admin/team-row";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 3 * 60_000;

export default async function TeamsPage() {
  await requireAdmin();
  const game = await getCurrentGame();

  if (!game) {
    return <p className="text-muted-foreground">Create a game first.</p>;
  }

  const teams = await prisma.team.findMany({
    where: { gameId: game.id },
    include: {
      players: { orderBy: { memberCode: "asc" } },
      currentCheckpoint: { select: { name: true } },
      assignments: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { checkpoint: { select: { name: true } } },
      },
      _count: { select: { scanEvents: true } },
    },
    orderBy: { name: "asc" },
  });

  const now = Date.now();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Teams & players</h1>
          <p className="text-muted-foreground text-sm">
            {teams.length} team{teams.length === 1 ? "" : "s"} ·{" "}
            {teams.reduce((n, t) => n + t.players.length, 0)} players
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/admin/teams/import" />}>
            <Upload className="size-4" /> Import CSV
          </Button>
          <Button variant="outline" render={<Link href="/admin/teams/credentials" />}>
            <Printer className="size-4" /> Credentials
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a team</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTeamForm />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {teams.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No teams yet. Add one above or import a roster.
          </p>
        ) : (
          teams.map((team) => (
            <TeamRow
              key={team.id}
              team={{
                id: team.id,
                name: team.name,
                code: team.code,
                score: team.score,
                status: team.status,
                scans: team._count.scanEvents,
                currentCheckpoint: team.currentCheckpoint?.name ?? null,
                destination: team.assignments[0]?.checkpoint.name ?? null,
                players: team.players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  memberCode: p.memberCode,
                  status: p.status,
                  online: Boolean(
                    p.lastActiveAt && now - p.lastActiveAt.getTime() < ONLINE_WINDOW_MS,
                  ),
                  lastActiveAt: p.lastActiveAt?.toISOString() ?? null,
                })),
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
