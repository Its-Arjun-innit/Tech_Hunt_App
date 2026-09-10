"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteCheckpoint, setCheckpointActive } from "@/app/admin/checkpoints/actions";

export function CheckpointDangerZone({
  checkpointId,
  active,
}: {
  checkpointId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Availability</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setCheckpointActive(checkpointId, !active);
              toast[result.ok ? "success" : "error"](result.message);
              router.refresh();
            })
          }
        >
          <Power className="size-4" /> {active ? "Disable checkpoint" : "Enable checkpoint"}
        </Button>

        <ConfirmButton
          variant="destructive"
          disabled={pending}
          title="Delete this checkpoint?"
          description="Its clues, challenge and scan history go with it, and any printed QR poster stops working. Teams already routed here will need rerouting. This cannot be undone."
          confirmLabel="Delete checkpoint"
          onConfirm={() =>
            new Promise<void>((resolve) =>
              startTransition(async () => {
                const result = await deleteCheckpoint(checkpointId);
                toast[result.ok ? "success" : "error"](result.message);
                if (result.ok) router.push("/admin/checkpoints");
                resolve();
              }),
            )
          }
        >
          <Trash2 className="size-4" /> Delete checkpoint
        </ConfirmButton>
      </CardContent>
    </Card>
  );
}
