import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

const RESULT_CLASS: Record<string, string> = {
  SUCCESS: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  DUPLICATE: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  RATE_LIMITED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

export default async function AuditPage({
  searchParams,
}: PageProps<"/admin/audit">) {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  const { tab } = await searchParams;
  const active = typeof tab === "string" ? tab : "scans";

  const [scans, logs, events] = await Promise.all([
    prisma.scanEvent.findMany({
      where: { team: { gameId: game.id } },
      include: {
        team: { select: { name: true } },
        player: { select: { name: true } },
        checkpoint: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: { OR: [{ gameId: game.id }, { gameId: null }] },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.gameEvent.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Every scan attempt and admin action, newest first.
        </p>
      </div>

      <Tabs defaultValue={active}>
        <TabsList>
          <TabsTrigger value="scans">Scans</TabsTrigger>
          <TabsTrigger value="admin">Admin actions</TabsTrigger>
          <TabsTrigger value="events">Game events</TabsTrigger>
        </TabsList>

        <TabsContent value="scans" className="space-y-1.5 pt-4">
          {scans.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {s.createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${RESULT_CLASS[s.result] ?? "text-muted-foreground"}`}
              >
                {s.result.replace("_", " ").toLowerCase()}
              </Badge>
              <span className="font-medium">{s.team.name}</span>
              <span className="text-muted-foreground">/ {s.player.name}</span>
              <span className="truncate">{s.checkpoint?.name ?? "unknown checkpoint"}</span>
              {s.pointsAwarded > 0 && (
                <span className="text-emerald-600 font-medium">+{s.pointsAwarded}</span>
              )}
              {s.ip && <span className="ml-auto text-xs text-muted-foreground">{s.ip}</span>}
            </div>
          ))}
          {scans.length === 0 && (
            <p className="text-sm text-muted-foreground">No scans recorded yet.</p>
          )}
        </TabsContent>

        <TabsContent value="admin" className="space-y-1.5 pt-4">
          {logs.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {l.createdAt.toLocaleString()}
              </span>
              <Badge variant="secondary" className="text-xs">
                {l.actorType.toLowerCase()}
              </Badge>
              <span className="font-medium">{l.action.replace(/_/g, " ").toLowerCase()}</span>
              {l.actorName && (
                <span className="text-muted-foreground truncate">by {l.actorName}</span>
              )}
              {l.entity && (
                <span className="text-xs text-muted-foreground">
                  {l.entity} {l.entityId?.slice(0, 8)}
                </span>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground">No admin actions recorded yet.</p>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-1.5 pt-4">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {e.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Badge variant="outline" className="text-xs">
                {e.type.replace(/_/g, " ").toLowerCase()}
              </Badge>
              <span className="truncate">{e.message}</span>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">No game events yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
