import { UserRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { PlayersTable } from "@/components/admin/players-table";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 3 * 60_000;

/** Turns a user agent into something an organizer can read at a glance. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "—";
  const ua = userAgent.toLowerCase();
  const os = ua.includes("iphone")
    ? "iPhone"
    : ua.includes("ipad")
      ? "iPad"
      : ua.includes("android")
        ? "Android"
        : ua.includes("windows")
          ? "Windows"
          : ua.includes("mac os")
            ? "Mac"
            : "Other";
  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome")
      ? "Chrome"
      : ua.includes("firefox")
        ? "Firefox"
        : ua.includes("safari")
          ? "Safari"
          : "";
  return browser ? `${os} · ${browser}` : os;
}

export default async function PlayersPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) {
    return (
      <EmptyState icon={UserRound} title="No game yet" description="Create a game first." />
    );
  }

  const players = await prisma.player.findMany({
    where: { team: { gameId: game.id } },
    include: {
      team: { select: { name: true } },
      sessions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { userAgent: true, ip: true },
      },
    },
    orderBy: [{ team: { name: "asc" } }, { memberCode: "asc" }],
  });

  const now = Date.now();

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Players"
        description={`${players.length} player${players.length === 1 ? "" : "s"} across ${new Set(players.map((p) => p.team.name)).size} teams. PINs are never shown, only reset.`}
      />

      {players.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No players yet"
          description="Add players from a team, or import a roster as CSV."
        />
      ) : (
        <PlayersTable
          players={players.map((p) => ({
            id: p.id,
            name: p.name,
            teamName: p.team.name,
            memberCode: p.memberCode,
            status: p.status,
            online: Boolean(
              p.lastActiveAt && now - p.lastActiveAt.getTime() < ONLINE_WINDOW_MS,
            ),
            lastActiveAt: p.lastActiveAt?.toISOString() ?? null,
            device: describeDevice(p.sessions[0]?.userAgent ?? null),
            signedIn: p.sessions.length > 0,
          }))}
        />
      )}
    </div>
  );
}
