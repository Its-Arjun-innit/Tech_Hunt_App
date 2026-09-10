"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleStop, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { GameStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { setGameStatus } from "@/app/admin/game/actions";

export function GameControls({ status }: { status: GameStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (next: GameStatus) =>
    new Promise<void>((resolve) =>
      startTransition(async () => {
        const result = await setGameStatus(next);
        toast[result.ok ? "success" : "error"](result.message);
        router.refresh();
        resolve();
      }),
    );

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "ACTIVE" && status !== "ENDED" && (
        <Button size="lg" disabled={pending} onClick={() => change("ACTIVE")}>
          {pending ? (
            <Loader2 className="size-4 motion-safe:animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {status === "PAUSED" ? "Resume game" : "Start game"}
        </Button>
      )}

      {status === "ACTIVE" && (
        <Button size="lg" variant="outline" disabled={pending} onClick={() => change("PAUSED")}>
          <Pause className="size-4" /> Pause game
        </Button>
      )}

      {status !== "ENDED" && (
        <ConfirmButton
          size="lg"
          variant="destructive"
          disabled={pending}
          title="End the game?"
          description="Scanning and scoring stop immediately, every live checkpoint reservation is cancelled, and final rankings are written. You can reopen the game afterwards."
          confirmLabel="End game"
          onConfirm={() => change("ENDED")}
        >
          <CircleStop className="size-4" /> End game
        </ConfirmButton>
      )}

      {status === "ENDED" && (
        <ConfirmButton
          size="lg"
          variant="outline"
          confirmVariant="default"
          disabled={pending}
          title="Reopen the game?"
          description="Teams become active again and scanning resumes. The final rankings recorded when the game ended are cleared."
          confirmLabel="Reopen game"
          onConfirm={() => change("ACTIVE")}
        >
          <RotateCcw className="size-4" /> Reopen game
        </ConfirmButton>
      )}
    </div>
  );
}
