import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementForm } from "@/components/admin/announcement-form";

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
      <div>
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <p className="text-muted-foreground text-sm">
          Broadcast to every team, or only to the ones you pick.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementForm teams={teams} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-lg border px-4 py-3">
            <p className="text-sm">{a.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {a.createdAt.toLocaleString()} ·{" "}
              {a.teamIds.length === 0
                ? "all teams"
                : a.teamIds.map((id) => teamNames.get(id) ?? "unknown").join(", ")}
            </p>
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
        )}
      </div>
    </div>
  );
}
