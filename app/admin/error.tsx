"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Replaces the bare "A server error occurred" page.
 *
 * Server errors here are almost always the database being unreachable or
 * misconfigured, so the copy points at that first and the digest gives the
 * organizer something to quote when reading deployment logs.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] render failed:", error);
  }, [error]);

  return (
    <div className="max-w-lg">
      <Card className="border-destructive/30">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-destructive mt-0.5" />
            <div className="space-y-1">
              <h1 className="font-semibold">This page could not load</h1>
              <p className="text-sm text-muted-foreground">
                Something failed on the server. The usual cause is the database being
                unreachable or a missing environment variable.
              </p>
            </div>
          </div>

          {error.digest && (
            <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={reset}>
              <RotateCw className="size-4" /> Try again
            </Button>
            <Button variant="outline" render={<a href="/admin" />}>
              Back to overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
