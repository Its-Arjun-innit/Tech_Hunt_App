import { prisma } from "@/lib/db";

export type CurrentObjective = {
  assignment: Record<string, unknown>;
  checkpoint: Record<string, unknown>;
  clue: Record<string, unknown> | null;
  level: number;
  maxLevel: number;
  canRequestMore: boolean;
  requestCost: number;
  expiresAt: Date;
  estimatedTravelTime: number;
};

/**
 * The clue the team should currently see, taking automatic time-based
 * unlocking into account without needing a background job.
 */
export async function currentObjective(teamId: string) {
  const assignment = await prisma.routingAssignment.findFirst({
    where: { teamId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      checkpoint: {
        include: { clues: { orderBy: { level: "asc" } }, challenge: true },
      },
    },
  });
  if (!assignment) return null;

  const game = await prisma.game.findFirst({
    where: { teams: { some: { id: teamId } } },
    select: { clueUnlockMode: true, clueUnlockAfterSeconds: true, clueRequestCost: true },
  });

  let level = assignment.clueLevel;
  if (game && game.clueUnlockMode !== "REQUEST") {
    const elapsed = (Date.now() - assignment.clueUnlockedAt.getTime()) / 1000;
    const earned = Math.floor(elapsed / Math.max(game.clueUnlockAfterSeconds, 1));
    level = Math.min(assignment.clueLevel + earned, assignment.checkpoint.clues.length);
  }

  const clue =
    assignment.checkpoint.clues.find((c) => c.level === level) ??
    assignment.checkpoint.clues[0] ??
    null;

  return {
    assignment,
    checkpoint: assignment.checkpoint,
    clue,
    level,
    maxLevel: assignment.checkpoint.clues.length,
    canRequestMore: level < assignment.checkpoint.clues.length,
    requestCost: game?.clueUnlockMode === "TIME" ? 0 : (game?.clueRequestCost ?? 0),
    expiresAt: assignment.expiresAt,
    estimatedTravelTime: assignment.estimatedTravelTime,
  };
}

export type CurrentTask =
  | { kind: "challenge"; challengeId: string; title: string; checkpointName: string }
  | {
      kind: "travel";
      clue: string | null;
      level: number;
      maxLevel: number;
      etaSeconds: number;
      checkpointName: string;
    }
  | { kind: "first-scan" }
  | { kind: "finished" };

/**
 * What this team should be doing right now.
 *
 * A team that scans a checkpoint carrying a challenge gets no routing
 * assignment until the challenge resolves, so "no assignment" on its own does
 * not mean finished. Reading it that way told a team mid-game that it had
 * completed everything, which is why this lives in one place that every
 * player surface calls rather than being re-derived per page.
 */
export async function currentTask(teamId: string): Promise<CurrentTask> {
  const assignment = await prisma.routingAssignment.findFirst({
    where: { teamId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      checkpoint: {
        include: { clues: { orderBy: { level: "asc" } }, challenge: true },
      },
    },
  });

  if (assignment) {
    const game = await prisma.game.findFirst({
      where: { teams: { some: { id: teamId } } },
      select: { clueUnlockMode: true, clueUnlockAfterSeconds: true },
    });

    let level = assignment.clueLevel;
    if (game && game.clueUnlockMode !== "REQUEST") {
      const elapsed = (Date.now() - assignment.clueUnlockedAt.getTime()) / 1000;
      const earned = Math.floor(elapsed / Math.max(game.clueUnlockAfterSeconds, 1));
      level = Math.min(assignment.clueLevel + earned, assignment.checkpoint.clues.length);
    }

    const clue =
      assignment.checkpoint.clues.find((c) => c.level === level) ??
      assignment.checkpoint.clues[0] ??
      null;

    return {
      kind: "travel",
      clue: clue?.text ?? null,
      level,
      maxLevel: assignment.checkpoint.clues.length,
      etaSeconds: assignment.estimatedTravelTime,
      checkpointName: assignment.checkpoint.name,
    };
  }

  // No destination: are they held at a challenge where they stand?
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      currentCheckpointId: true,
      currentCheckpoint: {
        select: { name: true, challenge: { select: { id: true, title: true, active: true } } },
      },
    },
  });

  const challenge = team?.currentCheckpoint?.challenge;
  if (challenge?.active) {
    const done = await prisma.challengeAttempt.findFirst({
      where: { teamId, challengeId: challenge.id, status: "SUCCESS" },
      select: { id: true },
    });
    if (!done) {
      return {
        kind: "challenge",
        challengeId: challenge.id,
        title: challenge.title,
        checkpointName: team!.currentCheckpoint!.name,
      };
    }
  }

  const scans = await prisma.scanEvent.count({ where: { teamId, result: "SUCCESS" } });
  return scans > 0 ? { kind: "finished" } : { kind: "first-scan" };
}
