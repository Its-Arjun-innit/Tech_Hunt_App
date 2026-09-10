import { test } from "node:test";
import assert from "node:assert/strict";
import { ChallengeType } from "@prisma/client";
import { gradeSubmission, publicChallengeConfig } from "./grade";
import { answerMatches } from "./schemas";

const quiz = {
  questions: [
    { question: "1+1?", options: ["1", "2", "3"], answerIndex: 1 },
    { question: "Colour of the sky?", options: ["blue", "green"], answerIndex: 0 },
  ],
};

const stages = {
  stages: [
    { prompt: "Stage one", answers: ["alpha"] },
    { prompt: "Stage two", answers: ["beta"] },
  ],
};

test("answer comparison ignores case, spacing and punctuation", () => {
  assert.ok(answerMatches("  HYDROGEN! ", ["hydrogen"]));
  assert.ok(answerMatches("registrar office", ["Registrar Office"]));
  assert.ok(!answerMatches("", ["hydrogen"]));
  assert.ok(!answerMatches("helium", ["hydrogen"]));
});

test("quiz passes only when every answer is correct", () => {
  const grade = (submission: unknown) =>
    gradeSubmission({ type: ChallengeType.QUIZ, config: quiz, submission, stageIndex: 0 }).status;

  assert.equal(grade([1, 0]), "SUCCESS");
  assert.equal(grade([1, 1]), "FAILED");
  assert.equal(grade([]), "FAILED");
});

test("riddle grades free text", () => {
  const config = { answers: ["hydrogen", "h"] };
  assert.equal(
    gradeSubmission({ type: ChallengeType.RIDDLE, config, submission: "Hydrogen", stageIndex: 0 })
      .status,
    "SUCCESS",
  );
  assert.equal(
    gradeSubmission({ type: ChallengeType.RIDDLE, config, submission: "oxygen", stageIndex: 0 })
      .status,
    "FAILED",
  );
});

test("multi-stage advances one stage at a time", () => {
  const first = gradeSubmission({
    type: ChallengeType.MULTI_STAGE,
    config: stages,
    submission: "alpha",
    stageIndex: 0,
  });
  assert.equal(first.status, "STAGE_CLEARED");
  assert.equal(first.status === "STAGE_CLEARED" && first.nextStage, 1);

  const last = gradeSubmission({
    type: ChallengeType.MULTI_STAGE,
    config: stages,
    submission: "beta",
    stageIndex: 1,
  });
  assert.equal(last.status, "SUCCESS");

  const wrong = gradeSubmission({
    type: ChallengeType.MULTI_STAGE,
    config: stages,
    submission: "beta",
    stageIndex: 0,
  });
  assert.equal(wrong.status, "FAILED");
});

test("physical and photo challenges wait for a volunteer", () => {
  for (const type of [ChallengeType.PHYSICAL, ChallengeType.PHOTO]) {
    assert.equal(
      gradeSubmission({ type, config: {}, submission: "anything", stageIndex: 0 }).status,
      "PENDING",
    );
  }
});

test("misconfigured challenges fail closed instead of awarding points", () => {
  const result = gradeSubmission({
    type: ChallengeType.QUIZ,
    config: { questions: [] },
    submission: [0],
    stageIndex: 0,
  });
  assert.equal(result.status, "FAILED");
});

test("public config never leaks the answers", () => {
  const pub = JSON.stringify(publicChallengeConfig(ChallengeType.QUIZ, quiz));
  assert.ok(pub.includes("Colour of the sky?"));
  assert.ok(!pub.includes("answerIndex"));

  const stagePub = JSON.stringify(publicChallengeConfig(ChallengeType.MULTI_STAGE, stages));
  assert.ok(stagePub.includes("Stage one"));
  assert.ok(!stagePub.includes("alpha"));
});
