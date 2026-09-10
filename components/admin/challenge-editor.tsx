"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

const TYPES = ["QR", "QUIZ", "PUZZLE", "RIDDLE", "PHYSICAL", "PHOTO", "MULTI_STAGE"];

/** Starter configuration shown when the organizer switches type. */
const TEMPLATES: Record<string, string> = {
  QR: "{}",
  PHYSICAL: "{}",
  PHOTO: "{}",
  QUIZ: JSON.stringify(
    {
      questions: [
        { question: "Which building is oldest?", options: ["Library", "Admin"], answerIndex: 0 },
      ],
    },
    null,
    2,
  ),
  PUZZLE: JSON.stringify({ answers: ["banyan"] }, null, 2),
  RIDDLE: JSON.stringify({ answers: ["hydrogen", "h"] }, null, 2),
  MULTI_STAGE: JSON.stringify(
    {
      stages: [
        { prompt: "How many floors?", answers: ["3", "three"] },
        { prompt: "Colour of the desk?", answers: ["brown"] },
      ],
    },
    null,
    2,
  ),
};

const CONFIG_HELP: Record<string, string> = {
  QR: "No configuration. Points are awarded as soon as the checkpoint is scanned.",
  PHYSICAL: "No configuration. A volunteer verifies the team in person.",
  PHOTO: "No configuration. A volunteer reviews the submitted photo.",
  QUIZ: "questions[]: question, options[], answerIndex (zero-based).",
  PUZZLE: "answers[]: every accepted spelling. Matching ignores case and punctuation.",
  RIDDLE: "answers[]: every accepted spelling. Matching ignores case and punctuation.",
  MULTI_STAGE: "stages[]: prompt plus accepted answers, solved in order.",
};

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
  const [config, setConfig] = useState(challenge?.config ?? TEMPLATES.QUIZ);

  return (
    <form
      className="space-y-5"
      action={(formData) =>
        startTransition(async () => {
          formData.set("config", config);
          const result = await saveChallenge(checkpointId, formData);
          toast[result.ok ? "success" : "error"](result.message);
          router.refresh();
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setConfig(TEMPLATES[e.target.value] ?? "{}");
            }}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={challenge?.title ?? ""} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt shown to players</Label>
        <Textarea id="prompt" name="prompt" defaultValue={challenge?.prompt ?? ""} rows={2} required />
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="config">Configuration (JSON)</Label>
        <Textarea
          id="config"
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          rows={8}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">{CONFIG_HELP[type]}</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <Label htmlFor="active" className="font-medium">
            Active
          </Label>
          <p className="text-sm text-muted-foreground">
            When active, teams must finish this before their next clue.
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
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm("Remove this challenge?")) return;
              startTransition(async () => {
                const result = await deleteChallenge(checkpointId);
                toast[result.ok ? "success" : "error"](result.message);
                router.refresh();
              });
            }}
          >
            <Trash2 className="size-4" /> Remove
          </Button>
        )}
      </div>
    </form>
  );
}
