"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteChallenge, saveChallenge } from "@/app/admin/checkpoints/actions";

type ChallengeValues = {
  type: string;
  title: string;
  prompt: string;
  points: number;
  maxAttempts: number;
  penaltyPoints: number;
  timeLimitSeconds: number | null;
  active: boolean;
  config: string;
};

const TYPES = [
  { value: "QUIZ", label: "Quiz", hint: "Multiple choice, graded automatically" },
  { value: "RIDDLE", label: "Riddle", hint: "One text answer" },
  { value: "PUZZLE", label: "Puzzle", hint: "One text answer" },
  { value: "MULTI_STAGE", label: "Multi-stage", hint: "Several answers in order" },
  { value: "PHYSICAL", label: "Physical", hint: "A volunteer verifies in person" },
  { value: "PHOTO", label: "Photo proof", hint: "A volunteer reviews a photo" },
  { value: "QR", label: "QR only", hint: "Points on scan, nothing to solve" },
];

/** Working shapes for the typed editors. */
type Question = { question: string; options: string[]; answerIndex: number };
type Stage = { prompt: string; answers: string };

/**
 * Typed challenge builder.
 *
 * The stored shape is unchanged, so the zod schemas in lib/challenges are
 * still the source of truth and still validate server-side. This only
 * replaces hand-written JSON, which was the easiest thing in the admin to get
 * silently wrong: a mistyped answerIndex made a question unanswerable.
 */
export function ChallengeEditor({
  checkpointId,
  challenge,
}: {
  checkpointId: string;
  challenge: ChallengeValues | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState(challenge?.type ?? "QUIZ");

  const parsed = safeParse(challenge?.config);

  const [questions, setQuestions] = useState<Question[]>(
    parsed?.questions ?? [{ question: "", options: ["", ""], answerIndex: 0 }],
  );
  const [answers, setAnswers] = useState<string>(
    Array.isArray(parsed?.answers) ? parsed.answers.join(", ") : "",
  );
  const [stages, setStages] = useState<Stage[]>(
    parsed?.stages?.map((s: { prompt: string; answers: string[] }) => ({
      prompt: s.prompt,
      answers: s.answers.join(", "),
    })) ?? [{ prompt: "", answers: "" }],
  );

  /** Builds exactly the JSON the server schemas expect. */
  const buildConfig = (): unknown => {
    const list = (s: string) =>
      s.split(",").map((a) => a.trim()).filter(Boolean);

    switch (type) {
      case "QUIZ":
        return {
          questions: questions.map((q) => ({
            question: q.question.trim(),
            options: q.options.map((o) => o.trim()).filter(Boolean),
            answerIndex: q.answerIndex,
          })),
        };
      case "RIDDLE":
      case "PUZZLE":
        return { answers: list(answers) };
      case "MULTI_STAGE":
        return {
          stages: stages.map((s) => ({ prompt: s.prompt.trim(), answers: list(s.answers) })),
        };
      default:
        return {};
    }
  };

  return (
    <form
      className="space-y-5"
      action={(formData) =>
        startTransition(async () => {
          formData.set("config", JSON.stringify(buildConfig()));
          const result = await saveChallenge(checkpointId, formData);
          toast[result.ok ? "success" : "error"](result.message);
          router.refresh();
        })
      }
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Type</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors hover:border-border-strong has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="mt-0.5 size-4"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={challenge?.title ?? ""} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt shown to players</Label>
        <Textarea
          id="prompt"
          name="prompt"
          defaultValue={challenge?.prompt ?? ""}
          rows={2}
          required
        />
      </div>

      {/* ── Type-specific configuration ─────────────────────────────── */}

      {type === "QUIZ" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Questions</p>
          {questions.map((q, qi) => (
            <div key={qi} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={q.question}
                  onChange={(e) =>
                    setQuestions((prev) =>
                      prev.map((x, i) => (i === qi ? { ...x, question: e.target.value } : x)),
                    )
                  }
                  placeholder={`Question ${qi + 1}`}
                  className="h-9"
                />
                {questions.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove question ${qi + 1}`}
                    onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Tick the correct answer. Blank options are dropped.
              </p>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.answerIndex === oi}
                    onChange={() =>
                      setQuestions((prev) =>
                        prev.map((x, i) => (i === qi ? { ...x, answerIndex: oi } : x)),
                      )
                    }
                    className="size-4 shrink-0"
                    aria-label={`Mark option ${oi + 1} correct`}
                  />
                  <Input
                    value={opt}
                    onChange={(e) =>
                      setQuestions((prev) =>
                        prev.map((x, i) =>
                          i === qi
                            ? { ...x, options: x.options.map((o, j) => (j === oi ? e.target.value : o)) }
                            : x,
                        ),
                      )
                    }
                    placeholder={`Option ${oi + 1}`}
                    className="h-9"
                  />
                  {q.options.length > 2 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove option ${oi + 1}`}
                      onClick={() =>
                        setQuestions((prev) =>
                          prev.map((x, i) =>
                            i === qi
                              ? {
                                  ...x,
                                  options: x.options.filter((_, j) => j !== oi),
                                  answerIndex: Math.min(x.answerIndex, x.options.length - 2),
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setQuestions((prev) =>
                    prev.map((x, i) => (i === qi ? { ...x, options: [...x.options, ""] } : x)),
                  )
                }
              >
                <Plus className="size-3.5" /> Add option
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setQuestions((prev) => [...prev, { question: "", options: ["", ""], answerIndex: 0 }])
            }
          >
            <Plus className="size-4" /> Add question
          </Button>
        </div>
      )}

      {(type === "RIDDLE" || type === "PUZZLE") && (
        <div className="space-y-2">
          <Label htmlFor="answers">Accepted answers</Label>
          <Input
            id="answers"
            value={answers}
            onChange={(e) => setAnswers(e.target.value)}
            placeholder="hydrogen, h"
          />
          <p className="text-xs text-muted-foreground">
            Comma separated. Matching already ignores case, spacing and punctuation, so only add
            genuinely different spellings.
          </p>
        </div>
      )}

      {type === "MULTI_STAGE" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Stages, solved in order</p>
          {stages.map((s, si) => (
            <div key={si} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{si + 1}</span>
                <Input
                  value={s.prompt}
                  onChange={(e) =>
                    setStages((prev) =>
                      prev.map((x, i) => (i === si ? { ...x, prompt: e.target.value } : x)),
                    )
                  }
                  placeholder="Prompt for this stage"
                  className="h-9"
                />
                {stages.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove stage ${si + 1}`}
                    onClick={() => setStages((prev) => prev.filter((_, i) => i !== si))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
              <Input
                value={s.answers}
                onChange={(e) =>
                  setStages((prev) =>
                    prev.map((x, i) => (i === si ? { ...x, answers: e.target.value } : x)),
                  )
                }
                placeholder="Accepted answers, comma separated"
                className="h-9"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setStages((prev) => [...prev, { prompt: "", answers: "" }])}
          >
            <Plus className="size-4" /> Add stage
          </Button>
        </div>
      )}

      {(type === "PHYSICAL" || type === "PHOTO" || type === "QR") && (
        <p className="rounded-lg border border-info/30 bg-info-subtle px-3 py-2 text-sm">
          {type === "QR"
            ? "Nothing to configure. Points are awarded the moment the checkpoint is scanned."
            : "Nothing to configure. A volunteer verifies this at the checkpoint, so post one there on the volunteers page."}
        </p>
      )}

      {/* ── Scoring ─────────────────────────────────────────────────── */}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="points">Points</Label>
          <Input id="points" name="points" type="number" min={0} defaultValue={challenge?.points ?? 40} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxAttempts">Max attempts</Label>
          <Input
            id="maxAttempts"
            name="maxAttempts"
            type="number"
            min={1}
            defaultValue={challenge?.maxAttempts ?? 3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="penaltyPoints">Wrong-answer penalty</Label>
          <Input
            id="penaltyPoints"
            name="penaltyPoints"
            type="number"
            min={0}
            defaultValue={challenge?.penaltyPoints ?? 0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeLimitSeconds">Time limit (s)</Label>
          <Input
            id="timeLimitSeconds"
            name="timeLimitSeconds"
            type="number"
            min={0}
            defaultValue={challenge?.timeLimitSeconds ?? ""}
            placeholder="none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <Label htmlFor="active" className="font-medium">
            Active
          </Label>
          <p className="text-sm text-muted-foreground">
            While active, teams must finish this before their next clue.
          </p>
        </div>
        <Switch id="active" name="active" defaultChecked={challenge?.active ?? true} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Saving…" : "Save challenge"}
        </Button>
        {challenge && (
          <ConfirmButton
            type="button"
            variant="destructive"
            disabled={pending}
            title="Remove this challenge?"
            description="Teams will pass straight through this checkpoint and be routed onward. Attempt history for the challenge is deleted with it."
            confirmLabel="Remove challenge"
            onConfirm={() =>
              new Promise<void>((resolve) =>
                startTransition(async () => {
                  const result = await deleteChallenge(checkpointId);
                  toast[result.ok ? "success" : "error"](result.message);
                  router.refresh();
                  resolve();
                }),
              )
            }
          >
            <Trash2 className="size-4" /> Remove
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function safeParse(json: string | undefined): any | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
