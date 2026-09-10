"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VolunteerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[volunteer] render failed:", error);
  }, [error]);

  return (
    <main className="flex-1 p-5 max-w-lg mx-auto w-full">
      <Card className="border-destructive/30">
        <CardContent className="pt-6 space-y-4 text-center">
          <AlertTriangle className="size-8 mx-auto text-destructive" />
          <div className="space-y-1">
            <h1 className="font-semibold">Could not load</h1>
            <p className="text-sm text-muted-foreground">
              Check your signal and try again. Tell an organizer if this keeps happening.
            </p>
          </div>
          <Button className="w-full h-11" onClick={reset}>
            <RotateCw className="size-4" /> Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
