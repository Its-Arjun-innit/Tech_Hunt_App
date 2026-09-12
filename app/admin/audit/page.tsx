import { ClipboardList } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AuditLog } from "@/components/admin/audit-log";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) {
    return (
      <EmptyState icon={ClipboardList} title="No game yet" description="Create a game first." />
    );
  }

  const { tab } = await searchParams;
  const defaultTab = typeof tab === "string" ? tab : "scans";

  const [scans, logs, events] = await Promise.all([
    prisma.scanEvent.findMany({
      where: { team: { gameId: game.id } },
      include: {
        team: { select: { name: true } },
        player: { select: { name: true } },
        checkpoint: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.auditLog.findMany({
      where: { OR: [{ gameId: game.id }, { gameId: null }] },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.gameEvent.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Audit log"
        description="Every scan attempt, including rejections, and every admin action. This is what disputes get settled from."
      />

      <AuditLog
        defaultTab={defaultTab}
        scans={scans.map((s) => ({
          id: s.id,
          at: s.createdAt.toISOString(),
          result: s.result,
          team: s.team.name,
          player: s.player.name,
          checkpoint: s.checkpoint?.name ?? "unknown checkpoint",
          points: s.pointsAwarded,
          ip: s.ip,
        }))}
        logs={logs.map((l) => ({
          id: l.id,
          at: l.createdAt.toISOString(),
          actorType: l.actorType,
          action: l.action,
          actor: l.actorName,
          entity: l.entity ? `${l.entity} ${l.entityId?.slice(0, 8) ?? ""}`.trim() : null,
        }))}
        events={events.map((e) => ({
          id: e.id,
          at: e.createdAt.toISOString(),
          type: e.type,
          message: e.message,
        }))}
      />
    </div>
  );
}
