"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleStop, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { GameStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { setGameStatus } from "@/app/admin/game/actions";

export function GameControls({ status }: { status: GameStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (next: GameStatus, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    startTransition(async () => {
      const result = await setGameStatus(next);
      toast[result.ok ? "success" : "error"](result.message);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "ACTIVE" && status !== "ENDED" && (
        <Button size="lg" disabled={pending} onClick={() => change("ACTIVE")}>
          <Play className="size-4" /> {status === "PAUSED" ? "Resume game" : "Start game"}
        </Button>
      )}

      {status === "ACTIVE" && (
        <Button size="lg" variant="outline" disabled={pending} onClick={() => change("PAUSED")}>
          <Pause className="size-4" /> Pause game
        </Button>
      )}

      {status !== "ENDED" && (
        <Button
          size="lg"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            change(
              "ENDED",
              "End the game? Scanning and scoring stop, and final rankings are recorded.",
            )
          }
        >
          <CircleStop className="size-4" /> End game
        </Button>
      )}

      {status === "ENDED" && (
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() => change("ACTIVE", "Reopen the game and resume scanning?")}
        >
          <RotateCcw className="size-4" /> Reopen game
        </Button>
      )}
    </div>
  );
}
