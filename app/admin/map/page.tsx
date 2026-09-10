import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { getCheckpointTraffic, TRAFFIC_CLASS, TRAFFIC_LABEL } from "@/lib/routing/traffic";
import { AutoRefresh } from "@/components/auto-refresh";
import { LiveMap } from "@/components/map/live-map";

export const dynamic = "force-dynamic";

export default async function LiveMapPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  const [checkpoints, traffic, volunteers] = await Promise.all([
    prisma.checkpoint.findMany({
      where: { gameId: game.id },
      include: {
        teamsHere: { select: { id: true, name: true } },
        assignments: {
          where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
          select: { team: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    getCheckpointTraffic(game.id),
    prisma.adminUser.findMany({
      where: { role: "VOLUNTEER", active: true, checkpointId: { not: null } },
      select: { id: true, name: true, checkpointId: true },
    }),
  ]);

  const volunteersByCheckpoint = new Map<string, string[]>();
  for (const v of volunteers) {
    const list = volunteersByCheckpoint.get(v.checkpointId!) ?? [];
    list.push(v.name);
    volunteersByCheckpoint.set(v.checkpointId!, list);
  }

  const points = checkpoints.map((cp) => {
    const t = traffic.get(cp.id);
    return {
      id: cp.id,
      name: cp.name,
      latitude: cp.latitude,
      longitude: cp.longitude,
      state: t?.state ?? ("GREEN" as const),
      teamsHere: cp.teamsHere.map((t) => t.name),
      approachingTeams: cp.assignments.map((a) => a.team.name),
      capacity: cp.capacity,
      volunteers: volunteersByCheckpoint.get(cp.id) ?? [],
    };
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <AutoRefresh seconds={8} />

      <div>
        <h1 className="text-2xl font-semibold">Live game map</h1>
        <p className="text-muted-foreground text-sm">
          Checkpoint positions, traffic and approaching teams. Drag a marker to move a checkpoint.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(["GREEN", "YELLOW", "RED", "GRAY"] as const).map((s) => (
          <span key={s} className={`rounded-full border px-2 py-0.5 font-medium ${TRAFFIC_CLASS[s]}`}>
            {TRAFFIC_LABEL[s]}
          </span>
        ))}
      </div>

      <LiveMap apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""} points={points} />
    </div>
  );
}
