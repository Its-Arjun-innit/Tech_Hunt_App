import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  const [challenges, checkpointsWithout] = await Promise.all([
    prisma.challenge.findMany({
      where: { checkpoint: { gameId: game.id } },
      include: {
        checkpoint: { select: { id: true, name: true } },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.checkpoint.findMany({
      where: { gameId: game.id, challenge: { is: null } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const pending = await prisma.challengeAttempt.groupBy({
    by: ["challengeId"],
    where: { status: "PENDING", challenge: { checkpoint: { gameId: game.id } } },
    _count: { _all: true },
  });
  const pendingBy = new Map(pending.map((p) => [p.challengeId, p._count._all]));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Challenges</h1>
        <p className="text-muted-foreground text-sm">
          Each checkpoint can hold one challenge. Edit it from that checkpoint.
        </p>
      </div>

      <div className="space-y-2">
        {challenges.map((c) => (
          <Link
            key={c.id}
            href={`/admin/checkpoints/${c.checkpoint.id}`}
            className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50"
          >
            <Badge variant="secondary">{c.type.replace("_", " ")}</Badge>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {c.checkpoint.name} · {c.points} pts · {c.maxAttempts} attempts
                {c.penaltyPoints > 0 && ` · −${c.penaltyPoints} on failure`}
              </p>
            </div>
            {!c.active && <Badge variant="outline">inactive</Badge>}
            {(pendingBy.get(c.id) ?? 0) > 0 && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                {pendingBy.get(c.id)} awaiting verification
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {c._count.attempts} attempt{c._count.attempts === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
        {challenges.length === 0 && (
          <p className="text-sm text-muted-foreground">No challenges configured yet.</p>
        )}
      </div>

      {checkpointsWithout.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-2">Checkpoints without a challenge</h2>
          <div className="flex flex-wrap gap-2">
            {checkpointsWithout.map((cp) => (
              <Link
                key={cp.id}
                href={`/admin/checkpoints/${cp.id}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {cp.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
