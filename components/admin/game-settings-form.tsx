"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateGameSettings } from "@/app/admin/game/actions";

type GameSettings = {
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  scoringFrozen: boolean;
  scansLocked: boolean;
  enforceRouting: boolean;
  leaderboardDelaySeconds: number;
  clueUnlockMode: string;
  clueUnlockAfterSeconds: number;
  clueRequestCost: number;
};

/** datetime-local needs a local "YYYY-MM-DDTHH:mm" string, not an ISO one. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GameSettingsForm({ game }: { game: GameSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      action={(formData) =>
        startTransition(async () => {
          const result = await updateGameSettings(formData);
          toast[result.ok ? "success" : "error"](result.message);
          router.refresh();
        })
      }
    >
      <div className="space-y-2">
        <Label htmlFor="name">Game name</Label>
        <Input id="name" name="name" defaultValue={game.name} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Start time</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={toLocalInput(game.startsAt)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">End time</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={toLocalInput(game.endsAt)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Toggle
          name="scansLocked"
          label="Lock scanning"
          hint="Players cannot bank checkpoints."
          defaultChecked={game.scansLocked}
        />
        <Toggle
          name="scoringFrozen"
          label="Freeze scoring"
          hint="Scans still record, but award zero points."
          defaultChecked={game.scoringFrozen}
        />
        <Toggle
          name="enforceRouting"
          label="Enforce routing"
          hint="Teams may only score at the checkpoint they were sent to."
          defaultChecked={game.enforceRouting}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="leaderboardDelaySeconds">Leaderboard delay (s)</Label>
          <Input
            id="leaderboardDelaySeconds"
            name="leaderboardDelaySeconds"
            type="number"
            min={0}
            max={3600}
            defaultValue={game.leaderboardDelaySeconds}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clueUnlockMode">Clue unlocking</Label>
          <select
            id="clueUnlockMode"
            name="clueUnlockMode"
            defaultValue={game.clueUnlockMode}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="TIME">Automatically over time</option>
            <option value="REQUEST">Only on request</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="clueRequestCost">Clue cost (points)</Label>
          <Input
            id="clueRequestCost"
            name="clueRequestCost"
            type="number"
            min={0}
            defaultValue={game.clueRequestCost}
          />
        </div>
      </div>

      <div className="space-y-2 max-w-xs">
        <Label htmlFor="clueUnlockAfterSeconds">Auto-unlock after (s)</Label>
        <Input
          id="clueUnlockAfterSeconds"
          name="clueUnlockAfterSeconds"
          type="number"
          min={10}
          defaultValue={game.clueUnlockAfterSeconds}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3">
      <div>
        <Label htmlFor={name} className="font-medium">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch id={name} name={name} defaultChecked={defaultChecked} />
    </div>
  );
}
