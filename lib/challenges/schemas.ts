import { z } from "zod";
import { ChallengeType } from "@prisma/client";

/** Free-text answers accepted for riddles, puzzles and multi-stage steps. */
const answerList = z.object({
  answers: z.array(z.string().min(1)).min(1),
});

const quizConfig = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2),
        answerIndex: z.number().int().min(0),
      }),
    )
    .min(1),
});

const multiStageConfig = z.object({
  stages: z
    .array(z.object({ prompt: z.string().min(1), answers: z.array(z.string().min(1)).min(1) }))
    .min(1),
});

/** PHYSICAL, PHOTO and QR carry no auto-gradable config. */
const emptyConfig = z.object({}).passthrough();

export const CHALLENGE_CONFIG_SCHEMAS = {
  [ChallengeType.QR]: emptyConfig,
  [ChallengeType.QUIZ]: quizConfig,
  [ChallengeType.PUZZLE]: answerList,
  [ChallengeType.RIDDLE]: answerList,
  [ChallengeType.PHYSICAL]: emptyConfig,
  [ChallengeType.PHOTO]: emptyConfig,
  [ChallengeType.MULTI_STAGE]: multiStageConfig,
} as const;

export type QuizConfig = z.infer<typeof quizConfig>;
export type AnswerConfig = z.infer<typeof answerList>;
export type MultiStageConfig = z.infer<typeof multiStageConfig>;

export function parseChallengeConfig(type: ChallengeType, config: unknown) {
  return CHALLENGE_CONFIG_SCHEMAS[type].safeParse(config ?? {});
}

/** Types a volunteer must sign off in person. */
export function needsVerification(type: ChallengeType) {
  return type === ChallengeType.PHYSICAL || type === ChallengeType.PHOTO;
}

/** Compare answers ignoring case, punctuation and extra spacing. */
export function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function answerMatches(submitted: string, accepted: string[]) {
  const norm = normalizeAnswer(submitted);
  return norm.length > 0 && accepted.some((a) => normalizeAnswer(a) === norm);
}
