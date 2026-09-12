import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Bell } from "lucide-react";
import { AUDIENCE_LABEL } from "@/lib/announcements";
import { AnnouncementList } from "@/components/admin/announcement-list";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  const [teams, announcements] = await Promise.all([
    prisma.team.findMany({
      where: { gameId: game.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.announcement.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const teamNames = new Map(teams.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Announcements"
        description="Broadcast to every team, or only to the ones you pick."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementForm teams={teams} />
        </CardContent>
      </Card>

      {announcements.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing sent yet"
          description="Announcements reach player dashboards within a few seconds, or the volunteer console when aimed at volunteers."
        />
      ) : (
        <AnnouncementList
          announcements={announcements.map((a) => ({
            id: a.id,
            message: a.message,
            audience: AUDIENCE_LABEL[a.audience],
            teams:
              a.audience === "SELECTED_TEAMS"
                ? a.teamIds.map((id) => teamNames.get(id) ?? "unknown")
                : [],
            createdAt: a.createdAt.toISOString(),
            scheduledFor: a.scheduledFor?.toISOString() ?? null,
          }))}
        />
      )}
    </div>
  );
}
