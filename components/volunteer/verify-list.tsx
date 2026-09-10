"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export function VerifyList({ attempts }: { attempts: Attempt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const visible = query.trim()
    ? attempts.filter((a) =>
        `${a.teamName} ${a.challengeTitle} ${a.checkpointName}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : attempts;

  const decide = (id: string, approve: boolean) =>
    startTransition(async () => {
      const result = await verifyAttempt(id, approve);
      toast[result.ok ? "success" : "error"](result.message);
      router.refresh();
    });

  if (attempts.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing waiting right now.</p>;
  }

  return (
    <div className="space-y-3">
      {attempts.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a team"
            className="h-11 pl-9"
          />
        </div>
      )}

      {visible.map((a) => (
        <div key={a.id} className="rounded-lg border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{a.teamName}</span>
            <Badge variant="secondary" className="text-xs">
              {a.challengeType.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {a.points} pts
            </Badge>
          </div>

          <div>
            <p className="text-sm font-medium">{a.challengeTitle}</p>
            <p className="text-sm text-muted-foreground">{a.prompt}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {a.checkpointName} ·{" "}
              {new Date(a.submittedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {a.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.photo}
              alt={`Submission from ${a.teamName}`}
              className="w-full rounded-lg border"
            />
          )}

          <div className="flex gap-2">
            <Button className="flex-1 h-12" disabled={pending} onClick={() => decide(a.id, true)}>
              <Check className="size-5" /> Approve
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12"
              disabled={pending}
              onClick={() => decide(a.id, false)}
            >
              <X className="size-5" /> Reject
            </Button>
          </div>
        </div>
      ))}

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">No match for that search.</p>
      )}
    </div>
  );
}
