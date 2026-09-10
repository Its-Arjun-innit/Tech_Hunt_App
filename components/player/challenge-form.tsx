"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { submitChallengeAnswer } from "@/app/(player)/challenge/actions";

type QuizConfig = { questions: { question: string; options: string[] }[] };
type StageConfig = { stages: { prompt: string }[]; stageCount: number };

const MAX_PHOTO_EDGE = 1024;
const PHOTO_QUALITY = 0.7;

/** Shrinks a camera photo in the browser so the upload stays small. */
async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
}

export function ChallengeForm({
  challengeId,
  type,
  config,
  stageIndex,
  attemptsLeft,
  penaltyPoints,
}: {
  challengeId: string;
  type: string;
  config: unknown;
  stageIndex: number;
  attemptsLeft: number;
  penaltyPoints: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState(stageIndex);
  const [left, setLeft] = useState(attemptsLeft);
  const [photo, setPhoto] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const send = (submission: unknown) =>
    startTransition(async () => {
      const result = await submitChallengeAnswer(challengeId, submission);

      if (!result.ok) {
        setLeft(result.attemptsLeft);
        toast.error(result.message);
        return;
      }
      if (result.status === "STAGE_CLEARED") {
        setStage(result.nextStage);
        formRef.current?.reset();
        toast.success("Stage cleared. Next one.");
        return;
      }
      if (result.status === "PENDING") {
        toast.success(result.message);
        router.refresh();
        return;
      }
      toast.success(`Correct! +${result.pointsAwarded} points`);
      router.refresh();
    });

  if (left <= 0) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="pt-6 text-center text-sm">
          No attempts remaining. Find a volunteer if you think this is wrong.
        </CardContent>
      </Card>
    );
  }

  const attemptNote = (
    <p className="text-xs text-muted-foreground">
      {left} attempt{left === 1 ? "" : "s"} left
      {penaltyPoints > 0 && ` · wrong answers cost ${penaltyPoints} points`}
    </p>
  );

  // ── Quiz ──────────────────────────────────────────────────────────
  if (type === "QUIZ") {
    const quiz = config as QuizConfig;
    return (
      <form
        ref={formRef}
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          send(quiz.questions.map((_, i) => Number(data.get(`q${i}`))));
        }}
      >
        {quiz.questions.map((q, i) => (
          <fieldset key={i} className="space-y-2">
            <legend className="font-medium mb-2">
              {i + 1}. {q.question}
            </legend>
            {q.options.map((opt, j) => (
              <label
                key={j}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input type="radio" name={`q${i}`} value={j} required className="size-4" />
                {opt}
              </label>
            ))}
          </fieldset>
        ))}
        {attemptNote}
        <Button type="submit" className="w-full h-12" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Submit answers
        </Button>
      </form>
    );
  }

  // ── Photo proof ───────────────────────────────────────────────────
  if (type === "PHOTO") {
    return (
      <div className="space-y-4">
        <Label
          htmlFor="photo"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 cursor-pointer"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Your submission" className="max-h-56 rounded-lg" />
          ) : (
            <>
              <Camera className="size-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tap to take a photo</span>
            </>
          )}
        </Label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setPhoto(await resizePhoto(file));
          }}
        />
        <Button
          className="w-full h-12"
          disabled={!photo || pending}
          onClick={() => photo && send({ photo })}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Submit for verification
        </Button>
      </div>
    );
  }

  // ── Physical: volunteer signs off in person ───────────────────────
  if (type === "PHYSICAL") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete the task, then submit so the volunteer at this checkpoint can verify you.
        </p>
        <Button className="w-full h-12" disabled={pending} onClick={() => send({ requested: true })}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Ask a volunteer to verify
        </Button>
      </div>
    );
  }

  // ── Riddle, puzzle, QR and multi-stage: one text answer ───────────
  const stages = type === "MULTI_STAGE" ? (config as StageConfig) : null;
  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("answer");
        if (typeof value === "string") send(value);
      }}
    >
      {stages && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Stage {stage + 1} of {stages.stageCount}
          </p>
          <p className="font-medium">{stages.stages[stage]?.prompt}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="answer">Your answer</Label>
        <Input
          id="answer"
          name="answer"
          required
          autoComplete="off"
          className="h-12 text-base"
          placeholder="Type your answer"
        />
      </div>
      {attemptNote}
      <Button type="submit" className="w-full h-12" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Submit answer
      </Button>
    </form>
  );
}
