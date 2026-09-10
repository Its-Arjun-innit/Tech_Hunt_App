"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createGame, selectGame } from "@/app/admin/game/actions";

export function GamePicker({
  games,
  currentId,
}: {
  games: { id: string; name: string; status: string }[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {games.length > 0 && (
          <div className="space-y-2">
            <label htmlFor="game" className="text-sm font-medium">
              Active game
            </label>
            <select
              id="game"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={currentId ?? ""}
              disabled={pending}
              onChange={(e) =>
                startTransition(async () => {
                  await selectGame(e.target.value);
                  router.refresh();
                })
              }
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {g.status}
                </option>
              ))}
            </select>
          </div>
        )}

        <form
          className="flex gap-2"
          action={(formData) =>
            startTransition(async () => {
              const result = await createGame(formData);
              toast[result.ok ? "success" : "error"](result.message);
              router.refresh();
            })
          }
        >
          <Input name="name" placeholder="New game name" required className="h-9" />
          <Button type="submit" variant="outline" disabled={pending}>
            <Plus className="size-4" /> Create
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
