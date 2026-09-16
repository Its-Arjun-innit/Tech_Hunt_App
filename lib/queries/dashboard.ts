import { prisma } from "@/lib/db";
import { currentTask } from "@/lib/game-engine/game-state";
import { getLeaderboard } from "@/lib/scoring/leaderboard";
import { visibleToTeam } from "@/lib/announcements";
import type { Announcement } from "@prisma/client";

export type DashboardData = {
  task: Awaited<ReturnType<typeof currentTask>>;
  completedScans: number;
  challengeCount: number;
  leaderboard: Awaited<ReturnType<typeof getLeaderboard>>;
  totalCheckpoints: number;
  announcements: Pick<Announcement, "id" | "message" | "createdAt" | "audience" | "scheduledFor">[];
  rank: number;
};

/**
 * Single query module that loads all data shared between the dashboard and
 * team pages. Both pages were running the same 5+ queries independently;
 * this eliminates that duplication.
 */
export async function getDashboardData(
  teamId: string,
  gameId: string,
): Promise<DashboardData> {
  const [task, completedScans, challengeCount, leaderboard, totalCheckpoints, rawAnnouncements] =
    await Promise.all([
      currentTask(teamId),
      prisma.scanEvent.count({ where: { teamId, result: "SUCCESS" } }),
      prisma.challengeAttempt.count({ where: { teamId, status: "SUCCESS" } }),
      getLeaderboard(gameId),
      prisma.checkpoint.count({ where: { gameId, active: true } }),
      prisma.announcement.findMany({
        where: { gameId },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

  const rank = leaderboard.find((r) => r.teamId === teamId)?.rank ?? leaderboard.length;
  const announcements = rawAnnouncements.filter((a) => visibleToTeam(a, teamId));

  return {
    task,
    completedScans,
    challengeCount,
    leaderboard,
    totalCheckpoints,
    announcements,
    rank,
  };
}
