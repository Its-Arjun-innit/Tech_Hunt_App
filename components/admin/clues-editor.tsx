"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setClues } from "@/app/admin/checkpoints/actions";

const LEVEL_HINT = [
  "Cryptic",
  "More descriptive",
  "Very clear",
  "Direct instruction",
];

export function CluesEditor({
  checkpointId,
  clues,
}: {
  checkpointId: string;
  clues: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [levels, setLevels] = useState<string[]>(clues.length > 0 ? clues : [""]);

  const update = (i: number, text: string) =>
    setLevels((prev) => prev.map((v, idx) => (idx === i ? text : v)));

  return (
    <div className="space-y-4">
      {levels.map((text, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Level {i + 1}
              <span className="ml-2 font-normal text-muted-foreground">
                {LEVEL_HINT[i] ?? "Extra detail"}
              </span>
            </label>
            {levels.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLevels((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
          <Textarea
            value={text}
            onChange={(e) => update(i, e.target.value)}
            rows={2}
            placeholder={
              i === 0
                ? "Where students gather when the day is getting started."
                : "A clearer version of the same clue."
            }
          />
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setLevels((prev) => [...prev, ""])}>
          <Plus className="size-4" /> Add level
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setClues(checkpointId, levels);
              toast[result.ok ? "success" : "error"](result.message);
              router.refresh();
            })
          }
        >
          <Save className="size-4" />
          {pending ? "Saving…" : "Save clues"}
        </Button>
      </div>
    </div>
  );
}
