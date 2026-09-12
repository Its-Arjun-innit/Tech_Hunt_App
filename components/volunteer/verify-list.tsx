"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/status-badge";
import { verifyAttempt } from "@/app/volunteer/actions";

type Attempt = {
  id: string;
  teamName: string;
  challengeTitle: string;
  challengeType: string;
  prompt: string;
  points: number;
  checkpointName: string;
  photo: string | null;
  submittedAt: string;
};

/**
 * The volunteer's whole job: find the team, decide, move on.
 *
 * Buttons are full width and 56px tall because this is used one-handed,
 * standing up, often in sunlight. Approve and reject are separated rather
 * than adjacent-and-identical so a mistap is less likely to award points to
 * the wrong team.
 */
export function VerifyList({ attempts }: { attempts: Attempt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = query.trim()
    ? attempts.filter((a) =>
        `${a.teamName} ${a.challengeTitle} ${a.checkpointName}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : attempts;

  const decide = (attempt: Attempt, approve: boolean) => {
    setBusyId(attempt.id);
    startTransition(async () => {
      const result = await verifyAttempt(attempt.id, approve);
      toast[result.ok ? "success" : "error"](result.message);
      setBusyId(null);
      router.refresh();
    });
  };

  if (attempts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <Check className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 font-medium">Nothing waiting</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Submissions appear here the moment a team asks to be verified.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attempts.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a team"
            className="h-12 pl-9 text-base"
          />
        </div>
      )}

      {visible.map((a) => {
        const busy = busyId === a.id;
        return (
          <article key={a.id} className="overflow-hidden rounded-xl border bg-surface">
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{a.teamName}</span>
                <StatusPill tone="brand">{a.points} pts</StatusPill>
                <StatusPill tone="neutral">{a.challengeType.replace("_", " ")}</StatusPill>
              </div>

              <div>
                <p className="font-medium">{a.challengeTitle}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{a.prompt}</p>
              </div>

              <p className="flex items-center gap-1.5 text-xs text-faint-foreground">
                <Clock className="size-3" />
                {a.checkpointName} ·{" "}
                {new Date(a.submittedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              {a.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.photo}
                  alt={`Submission from ${a.teamName}`}
                  className="w-full rounded-lg border"
                />
              )}
            </div>

            <div className="grid gap-2 border-t bg-muted/30 p-3">
              <Button
                className="h-14 w-full text-base font-semibold"
                disabled={pending}
                onClick={() => decide(a, true)}
              >
                {busy ? (
                  <Loader2 className="size-5 motion-safe:animate-spin" />
                ) : (
                  <Check className="size-5" />
                )}
                Approve, award {a.points} points
              </Button>
              <Button
                variant="ghost"
                className="h-11 w-full text-danger"
                disabled={pending}
                onClick={() => decide(a, false)}
              >
                <X className="size-4" /> Did not complete it
              </Button>
            </div>
          </article>
        );
      })}

      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No team matches “{query.trim()}”.
        </p>
      )}
    </div>
  );
}
