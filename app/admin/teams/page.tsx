import Link from "next/link";
import { Printer, Upload, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTeamForm } from "@/components/admin/create-team-form";
import { TeamRow } from "@/components/admin/team-row";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

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
      <PageHeader
        title="Teams & players"
        description={`${teams.length} team${teams.length === 1 ? "" : "s"} · ${teams.reduce((n, t) => n + t.players.length, 0)} players`}
        actions={
          <>
            <Button variant="outline" render={<Link href="/admin/teams/import" />}>
              <Upload className="size-4" /> Import CSV
            </Button>
            <Button variant="outline" render={<Link href="/admin/teams/credentials" />}>
              <Printer className="size-4" /> Credentials
            </Button>
          </>
        }
      />

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
          <EmptyState
            icon={Users}
            title="No teams yet"
            description="Add a team above, or import a whole roster as CSV and let the system generate every PIN."
          />
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
