import { ChallengeType } from "@prisma/client";
import {
  answerMatches,
  parseChallengeConfig,
  type MultiStageConfig,
  type QuizConfig,
  type AnswerConfig,
} from "./schemas";

export type GradeResult =
  | { status: "SUCCESS" }
  | { status: "FAILED"; message: string }
  /** Correct so far, but more stages remain. */
  | { status: "STAGE_CLEARED"; nextStage: number }
  /** Needs a human: PHYSICAL and PHOTO. */
  | { status: "PENDING" };

/**
 * Grades a submission server-side. The client never decides whether an answer
 * is correct, and the accepted answers are never sent to the browser.
 */
export function gradeSubmission(args: {
  type: ChallengeType;
  config: unknown;
  submission: unknown;
  stageIndex: number;
}): GradeResult {
  const parsed = parseChallengeConfig(args.type, args.config);
  if (!parsed.success) return { status: "FAILED", message: "Challenge is misconfigured." };

  switch (args.type) {
    case ChallengeType.QR:
      // Reaching the challenge means the QR was already validated by the scan.
      return { status: "SUCCESS" };

    case ChallengeType.PHYSICAL:
    case ChallengeType.PHOTO:
      return { status: "PENDING" };

    case ChallengeType.QUIZ: {
      const cfg = parsed.data as QuizConfig;
      const answers = Array.isArray(args.submission) ? (args.submission as unknown[]) : [];
      const allCorrect = cfg.questions.every((q, i) => Number(answers[i]) === q.answerIndex);
      return allCorrect
        ? { status: "SUCCESS" }
        : { status: "FAILED", message: "Not all answers are correct." };
    }

    case ChallengeType.RIDDLE:
    case ChallengeType.PUZZLE: {
      const cfg = parsed.data as AnswerConfig;
      const text = typeof args.submission === "string" ? args.submission : "";
      return answerMatches(text, cfg.answers)
        ? { status: "SUCCESS" }
        : { status: "FAILED", message: "That is not the answer." };
    }

    case ChallengeType.MULTI_STAGE: {
      const cfg = parsed.data as MultiStageConfig;
      const stage = cfg.stages[args.stageIndex];
      if (!stage) return { status: "SUCCESS" };
      const text = typeof args.submission === "string" ? args.submission : "";
      if (!answerMatches(text, stage.answers)) {
        return { status: "FAILED", message: "That is not the answer for this stage." };
      }
      const next = args.stageIndex + 1;
      return next >= cfg.stages.length
        ? { status: "SUCCESS" }
        : { status: "STAGE_CLEARED", nextStage: next };
    }
  }
}

/** Config trimmed of its answers, safe to render in the browser. */
export function publicChallengeConfig(type: ChallengeType, config: unknown) {
  const parsed = parseChallengeConfig(type, config);
  if (!parsed.success) return null;

  if (type === ChallengeType.QUIZ) {
    const cfg = parsed.data as QuizConfig;
    return {
      questions: cfg.questions.map((q) => ({ question: q.question, options: q.options })),
    };
  }
  if (type === ChallengeType.MULTI_STAGE) {
    const cfg = parsed.data as MultiStageConfig;
    return {
      stages: cfg.stages.map((s) => ({ prompt: s.prompt })),
      stageCount: cfg.stages.length,
    };
  }
  return {};
}
