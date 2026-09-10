import { prisma } from "@/lib/db";

export type LeaderboardRow = {
  rank: number;
  teamId: string;
  teamName: string;
  points: number;
  checkpoints: number;
  challenges: number;
};

/**
 * Ranks teams from the ScoreEvent ledger rather than the cached Team.score, so
 * an organizer can hide very recent scoring to blunt leaderboard-watching.
 */
export async function getLeaderboard(gameId: string): Promise<LeaderboardRow[]> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { leaderboardDelaySeconds: true },
  });
  const cutoff = new Date(Date.now() - (game?.leaderboardDelaySeconds ?? 0) * 1000);

  const [teams, scores, scans, challenges] = await Promise.all([
    prisma.team.findMany({
      where: { gameId },
      select: { id: true, name: true },
    }),
    prisma.scoreEvent.groupBy({
      by: ["teamId"],
      where: { team: { gameId }, createdAt: { lte: cutoff } },
      _sum: { points: true },
    }),
    prisma.scanEvent.groupBy({
      by: ["teamId"],
      where: { team: { gameId }, result: "SUCCESS", createdAt: { lte: cutoff } },
      _count: { _all: true },
    }),
    prisma.challengeAttempt.groupBy({
      by: ["teamId"],
      where: { team: { gameId }, status: "SUCCESS", createdAt: { lte: cutoff } },
      _count: { _all: true },
    }),
  ]);

  const pointsBy = new Map(scores.map((s) => [s.teamId, s._sum.points ?? 0]));
  const scansBy = new Map(scans.map((s) => [s.teamId, s._count._all]));
  const challengesBy = new Map(challenges.map((c) => [c.teamId, c._count._all]));

  return teams
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      points: pointsBy.get(t.id) ?? 0,
      checkpoints: scansBy.get(t.id) ?? 0,
      challenges: challengesBy.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || b.checkpoints - a.checkpoints)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
