"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setRoutes } from "@/app/admin/checkpoints/actions";

type Destination = {
  id: string;
  name: string;
  distance: number;
  active: boolean;
  selected: boolean;
};

export function RoutesEditor({
  checkpointId,
  destinations,
}: {
  checkpointId: string;
  destinations: Destination[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(
    () => new Set(destinations.filter((d) => d.selected).map((d) => d.id)),
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (destinations.length === 0) {
    return <p className="text-sm text-muted-foreground">Add another checkpoint first.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {destinations.map((d) => (
          <label
            key={d.id}
            className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:border-foreground/20 hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
          >
            <input
              type="checkbox"
              className="size-4"
              checked={selected.has(d.id)}
              onChange={() => toggle(d.id)}
            />
            <span className="flex-1 truncate">
              {d.name}
              {!d.active && <span className="text-muted-foreground"> (inactive)</span>}
            </span>
            <span className="text-muted-foreground tabular-nums">{d.distance}m</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              ~{Math.max(1, Math.round(d.distance / 1.3 / 60))} min
            </span>
          </label>
        ))}
      </div>

      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setRoutes(checkpointId, [...selected]);
            toast[result.ok ? "success" : "error"](result.message);
            router.refresh();
          })
        }
      >
        <Save className="size-4" />
        {pending ? "Saving…" : "Save destinations"}
      </Button>
    </div>
  );
}
