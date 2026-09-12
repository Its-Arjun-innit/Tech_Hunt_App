"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/status-badge";
import { ConfirmButton } from "@/components/confirm-button";
import {
  assignVolunteer, createVolunteer, resetVolunteerPassword, setVolunteerActive,
} from "@/app/admin/volunteers/actions";

type Volunteer = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  checkpointId: string | null;
  checkpointName: string | null;
  lastSignIn: string | null;
  lastVerified: string | null;
  online: boolean;
  pendingHere: number;
};

type Checkpoint = { id: string; name: string; challenge: string | null };

export function VolunteersPanel({
  volunteers,
  checkpoints,
}: {
  volunteers: Volunteer[];
  checkpoints: Checkpoint[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  /** Generated passwords appear once; they are hashed and unreadable after. */
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<{ ok: boolean; message: string; password?: string }>, key?: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result.password && key) {
        setSecrets((s) => ({ ...s, [key]: result.password! }));
      }
      toast[result.ok ? "success" : "error"](result.message);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a volunteer</CardTitle>
          <p className="text-sm text-muted-foreground">
            A first password is generated and shown once, so write it down before leaving.
          </p>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            className="flex flex-wrap items-end gap-3"
            action={(formData) =>
              startTransition(async () => {
                const result = await createVolunteer(formData);
                if (result.password) {
                  setSecrets((s) => ({ ...s, new: `${formData.get("email")} · ${result.password}` }));
                }
                toast[result.ok ? "success" : "error"](result.message);
                if (result.ok) formRef.current?.reset();
                router.refresh();
              })
            }
          >
            <div className="space-y-1.5">
              <Label htmlFor="v-name">Name</Label>
              <Input id="v-name" name="name" required className="h-9 w-40" placeholder="Priya" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-email">Email</Label>
              <Input
                id="v-email"
                name="email"
                type="email"
                required
                className="h-9 w-56"
                placeholder="priya@campus.edu"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-checkpoint">Post at</Label>
              <select
                id="v-checkpoint"
                name="checkpointId"
                className="h-9 w-48 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Not posted yet</option>
                {checkpoints.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={pending}>
              <Plus className="size-4" /> Add volunteer
            </Button>
          </form>

          {secrets.new && (
            <p className="mt-3 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 font-mono text-sm">
              {secrets.new}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {volunteers.map((v) => (
          <div key={v.id} className="rounded-xl border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {v.name}
                  {v.online ? (
                    <StatusPill tone="success">On duty</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">Offline</StatusPill>
                  )}
                  {!v.active && <StatusPill tone="danger">Disabled</StatusPill>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{v.email}</p>
              </div>

              {v.pendingHere > 0 && (
                <StatusPill tone="warning">
                  {v.pendingHere} waiting to verify
                </StatusPill>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`assign-${v.id}`} className="text-xs">
                  Posted at
                </Label>
                <select
                  id={`assign-${v.id}`}
                  value={v.checkpointId ?? ""}
                  disabled={pending}
                  onChange={(e) => run(() => assignVolunteer(v.id, e.target.value || null))}
                  className="h-9 w-52 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Not posted</option>
                  {checkpoints.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.challenge ? ` — ${c.challenge}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => resetVolunteerPassword(v.id), v.id)}
                >
                  <KeyRound className="size-3.5" /> Reset password
                </Button>

                {v.active ? (
                  <ConfirmButton
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    title={`Disable ${v.name}?`}
                    description="They are signed out immediately and cannot sign in again until re-enabled. Any submissions they were reviewing stay pending for another volunteer."
                    confirmLabel="Disable volunteer"
                    onConfirm={() => run(() => setVolunteerActive(v.id, false))}
                  >
                    <UserX className="size-3.5" /> Disable
                  </ConfirmButton>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => setVolunteerActive(v.id, true))}
                  >
                    <UserCheck className="size-3.5" /> Enable
                  </Button>
                )}
              </div>

              {secrets[v.id] && (
                <Badge variant="outline" className="font-mono">
                  {secrets[v.id]}
                </Badge>
              )}
            </div>

            <p className="mt-3 text-xs text-faint-foreground">
              {v.lastSignIn
                ? `Last signed in ${new Date(v.lastSignIn).toLocaleString()}`
                : "Never signed in"}
              {v.lastVerified &&
                ` · last verified ${new Date(v.lastVerified).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
