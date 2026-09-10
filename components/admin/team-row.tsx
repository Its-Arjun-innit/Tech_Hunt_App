"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, Plus, Trash2, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import {
  addPlayer, deletePlayer, deleteTeam, forceLogout, resetPin,
  setPlayerStatus, setTeamStatus,
} from "@/app/admin/teams/actions";

type PlayerView = {
  id: string;
  name: string;
  memberCode: string;
  status: string;
  online: boolean;
  lastActiveAt: string | null;
};

type TeamView = {
  id: string;
  name: string;
  code: string;
  score: number;
  status: string;
  scans: number;
  currentCheckpoint: string | null;
  destination: string | null;
  players: PlayerView[];
};

export function TeamRow({ team }: { team: TeamView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  /** PINs are shown once here; they are never retrievable later. */
  const [newPins, setNewPins] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await fn();
      toast[result.ok ? "success" : "error"](result.message);
      router.refresh();
    });

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <ChevronDown
            className={`size-4 shrink-0 motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{team.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {team.code} · {team.players.length} player{team.players.length === 1 ? "" : "s"}
              {team.currentCheckpoint && ` · at ${team.currentCheckpoint}`}
              {team.destination && ` → ${team.destination}`}
            </p>
          </div>
          {team.status !== "ACTIVE" && <Badge variant="secondary">{team.status}</Badge>}
          <span className="text-sm text-muted-foreground tabular-nums">{team.scans} scans</span>
          <span className="font-semibold tabular-nums w-14 text-right">{team.score}</span>
        </button>

        {open && (
          <div className="border-t px-4 py-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(() => setTeamStatus(team.id, team.status === "ACTIVE" ? "DISABLED" : "ACTIVE"))
                }
              >
                {team.status === "ACTIVE" ? (
                  <>
                    <UserX className="size-3.5" /> Disable team
                  </>
                ) : (
                  <>
                    <UserCheck className="size-3.5" /> Enable team
                  </>
                )}
              </Button>
              <ConfirmButton
                size="sm"
                variant="destructive"
                disabled={pending}
                title={`Delete ${team.name}?`}
                description={`Its ${team.players.length} player${team.players.length === 1 ? "" : "s"}, ${team.scans} scan${team.scans === 1 ? "" : "s"} and score of ${team.score} are deleted with it. This cannot be undone; disable the team instead if you only want to stop it playing.`}
                confirmLabel="Delete team"
                onConfirm={() => run(() => deleteTeam(team.id))}
              >
                <Trash2 className="size-3.5" /> Delete team
              </ConfirmButton>
            </div>

            <div className="space-y-2">
              {team.players.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 transition-colors hover:border-foreground/20"
                >
                  <span
                    className={`size-1.5 rounded-full shrink-0 ${p.online ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                    title={p.online ? "Online" : "Offline"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {p.name}{" "}
                      <span className="font-normal text-muted-foreground">({p.memberCode})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.status !== "ACTIVE" && `${p.status} · `}
                      {p.lastActiveAt
                        ? `last active ${new Date(p.lastActiveAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "never signed in"}
                    </p>
                  </div>

                  {newPins[p.id] && (
                    <Badge variant="outline" className="font-mono">
                      PIN {newPins[p.id]}
                    </Badge>
                  )}

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      title="Reset PIN"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await resetPin(p.id);
                          if (result.pin) setNewPins((v) => ({ ...v, [p.id]: result.pin! }));
                          toast[result.ok ? "success" : "error"](result.message);
                          router.refresh();
                        })
                      }
                    >
                      <KeyRound className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      title="Force sign out"
                      onClick={() => run(() => forceLogout(p.id))}
                    >
                      <LogOut className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      title={p.status === "ACTIVE" ? "Disable player" : "Reactivate player"}
                      onClick={() =>
                        run(() =>
                          setPlayerStatus(p.id, p.status === "ACTIVE" ? "DISABLED" : "ACTIVE"),
                        )
                      }
                    >
                      {p.status === "ACTIVE" ? (
                        <UserX className="size-3.5" />
                      ) : (
                        <UserCheck className="size-3.5" />
                      )}
                    </Button>
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      title={`Remove ${p.name}?`}
                      description={`${p.name} is deleted from ${team.name} along with their scan history. Points they earned stay with the team. Disable them instead to block sign-in without losing the record.`}
                      confirmLabel="Remove player"
                      aria-label={`Remove ${p.name}`}
                      onConfirm={() => run(() => deletePlayer(p.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </ConfirmButton>
                  </div>
                </div>
              ))}
            </div>

            <form
              ref={formRef}
              className="flex flex-wrap gap-2"
              action={(formData) =>
                startTransition(async () => {
                  const result = await addPlayer(formData);
                  toast[result.ok ? "success" : "error"](result.message);
                  if (result.ok) formRef.current?.reset();
                  router.refresh();
                })
              }
            >
              <input type="hidden" name="teamId" value={team.id} />
              <Input name="name" placeholder="Player name" required className="h-9 w-40" />
              <Input
                name="memberCode"
                placeholder="Code"
                required
                className="h-9 w-24 uppercase"
              />
              <Button type="submit" size="sm" variant="outline" disabled={pending}>
                <Plus className="size-3.5" /> Add player
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
