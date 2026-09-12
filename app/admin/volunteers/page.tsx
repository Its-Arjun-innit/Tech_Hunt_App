import { HandHelping } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { VolunteersPanel } from "@/components/admin/volunteers-panel";

export const dynamic = "force-dynamic";

const ACTIVE_WINDOW_MS = 10 * 60_000;

export default async function VolunteersPage() {
  await requireAdmin();
  const game = await getCurrentGame();

  const [volunteers, checkpoints, pending] = await Promise.all([
    prisma.adminUser.findMany({
      where: { role: "VOLUNTEER" },
      include: {
        checkpoint: { select: { id: true, name: true } },
        sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        verifiedAttempts: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { updatedAt: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    game
      ? prisma.checkpoint.findMany({
          where: { gameId: game.id },
          select: { id: true, name: true, challenge: { select: { title: true, type: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    game
      ? prisma.challengeAttempt.groupBy({
          by: ["challengeId"],
          where: { status: "PENDING", team: { gameId: game.id } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  // Pending work per checkpoint, so an organizer can see who has a queue.
  const challengeToCheckpoint = new Map<string, string>();
  if (game) {
    const challenges = await prisma.challenge.findMany({
      where: { checkpoint: { gameId: game.id } },
      select: { id: true, checkpointId: true },
    });
    for (const c of challenges) challengeToCheckpoint.set(c.id, c.checkpointId);
  }
  const pendingByCheckpoint = new Map<string, number>();
  for (const p of pending) {
    const cpId = challengeToCheckpoint.get(p.challengeId);
    if (cpId) pendingByCheckpoint.set(cpId, (pendingByCheckpoint.get(cpId) ?? 0) + p._count._all);
  }

  const now = Date.now();

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Volunteers"
        description="Volunteers verify physical and photo challenges in person. They only ever see the volunteer console, never the admin one."
      />

      <VolunteersPanel
        volunteers={volunteers.map((v) => ({
          id: v.id,
          name: v.name,
          email: v.email,
          active: v.active,
          checkpointId: v.checkpoint?.id ?? null,
          checkpointName: v.checkpoint?.name ?? null,
          lastSignIn: v.sessions[0]?.createdAt.toISOString() ?? null,
          lastVerified: v.verifiedAttempts[0]?.updatedAt.toISOString() ?? null,
          online: Boolean(
            v.sessions[0] && now - v.sessions[0].createdAt.getTime() < ACTIVE_WINDOW_MS,
          ),
          pendingHere: v.checkpoint ? (pendingByCheckpoint.get(v.checkpoint.id) ?? 0) : 0,
        }))}
        checkpoints={checkpoints.map((c) => ({
          id: c.id,
          name: c.name,
          challenge: c.challenge ? `${c.challenge.title} (${c.challenge.type})` : null,
        }))}
      />

      {volunteers.length === 0 && (
        <EmptyState
          icon={HandHelping}
          title="No volunteers yet"
          description="Create an account above for each person staffing a physical or photo challenge, then post them to a checkpoint."
        />
      )}
    </div>
  );
}
