"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Compass, Lightbulb, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { askForClue } from "@/app/(player)/actions";

export function ClueCard({
  clue,
  level,
  maxLevel,
  canRequestMore,
  requestCost,
  estimatedTravelTime,
}: {
  clue: string;
  level: number;
  maxLevel: number;
  canRequestMore: boolean;
  requestCost: number;
  estimatedTravelTime: number;
}) {
  const [pending, startTransition] = useTransition();

  const onAsk = () =>
    startTransition(async () => {
      const result = await askForClue();
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });

  const walkMinutes = Math.max(1, Math.round(estimatedTravelTime / 60));

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Compass className="size-4" /> Your next destination
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Clue {level} of {maxLevel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg leading-snug">{clue}</p>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Footprints className="size-3.5" />
          about {walkMinutes} min walk
        </p>

        {canRequestMore && (
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={onAsk}
            disabled={pending}
          >
            <Lightbulb className="size-4" />
            {pending
              ? "Unlocking…"
              : requestCost > 0
                ? `Need a clearer clue (−${requestCost} pts)`
                : "Need a clearer clue"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
