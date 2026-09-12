"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { askForClue } from "@/app/(player)/actions";

type Level = { level: number; text: string | null };

const HINT = ["Cryptic", "More descriptive", "Very clear", "Direct instruction"];

/**
 * Progressive clue levels.
 *
 * Locked levels are shown as locked rather than hidden, so a team can see that
 * more help exists and decide whether it is worth the points. The text of a
 * locked level never reaches the browser; the server only sends what is
 * already unlocked.
 */
export function ClueLevels({
  levels,
  currentLevel,
  canRequestMore,
  requestCost,
}: {
  levels: Level[];
  currentLevel: number;
  canRequestMore: boolean;
  requestCost: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (levels.length <= 1) return null;

  const unlock = () =>
    startTransition(async () => {
      const result = await askForClue();
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
      router.refresh();
    });

  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Clues for this destination
      </h2>

      <ol className="mt-3 space-y-2">
        {levels.map((l) => {
          const unlocked = l.level <= currentLevel;
          return (
            <li key={l.level}>
              <div
                className={`rounded-xl border px-4 py-3 transition-colors ${
                  unlocked ? "bg-surface" : "border-dashed bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Clue {l.level}
                    <span className="ml-2 font-normal normal-case tracking-normal">
                      {HINT[l.level - 1] ?? "Extra detail"}
                    </span>
                  </span>
                  {!unlocked && <Lock className="size-3.5 shrink-0 text-faint-foreground" />}
                </div>

                {/* The clue is the most important text in the game, so it is
                    never animated in. It renders or it does not. */}
                {unlocked ? (
                  <p className="mt-1.5 text-sm leading-snug">{l.text}</p>
                ) : (
                  <p className="mt-1.5 text-sm text-faint-foreground">Locked</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {canRequestMore && (
        <Button
          variant="outline"
          className="mt-3 h-11 w-full"
          disabled={pending}
          onClick={unlock}
        >
          {pending ? (
            <Loader2 className="size-4 motion-safe:animate-spin" />
          ) : (
            <Lightbulb className="size-4" />
          )}
          {pending
            ? "Unlocking…"
            : requestCost > 0
              ? `Reveal a clearer clue (−${requestCost} pts)`
              : "Reveal a clearer clue"}
        </Button>
      )}
    </section>
  );
}
