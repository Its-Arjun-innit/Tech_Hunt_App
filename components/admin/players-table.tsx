"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/status-badge";
import { forceLogout, resetPin, setPlayerStatus } from "@/app/admin/teams/actions";

type PlayerRow = {
  id: string;
  name: string;
  teamName: string;
  memberCode: string;
  status: string;
  online: boolean;
  lastActiveAt: string | null;
  device: string;
  signedIn: boolean;
};

export function PlayersTable({ players }: { players: PlayerRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  /** New PINs are shown once here; they can never be read back. */
  const [newPins, setNewPins] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await fn();
      toast[result.ok ? "success" : "error"](result.message);
      router.refresh();
    });

  const columns: Column<PlayerRow>[] = [
    {
      key: "name",
      header: "Player",
      sortValue: (p) => p.name,
      searchValue: (p) => `${p.name} ${p.memberCode} ${p.teamName}`,
      cell: (p) => (
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 shrink-0 rounded-full ${p.online ? "bg-success" : "bg-faint-foreground/40"}`}
            title={p.online ? "Online" : "Offline"}
          />
          <span className="font-medium">{p.name}</span>
          {newPins[p.id] && (
            <Badge variant="outline" className="font-mono text-xs">
              PIN {newPins[p.id]}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "team",
      header: "Team",
      sortValue: (p) => p.teamName,
      cell: (p) => <span className="text-muted-foreground">{p.teamName}</span>,
    },
    {
      key: "code",
      header: "Member code",
      sortValue: (p) => p.memberCode,
      cell: (p) => <span className="font-mono text-xs">{p.memberCode}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (p) =>
        p.status === "ACTIVE" ? (
          <StatusPill tone={p.online ? "success" : "neutral"}>
            {p.online ? "Online" : "Offline"}
          </StatusPill>
        ) : (
          <StatusPill tone="danger">Disabled</StatusPill>
        ),
    },
    {
      key: "lastActive",
      header: "Last active",
      sortValue: (p) => p.lastActiveAt ?? "",
      cell: (p) => (
        <span className="text-xs text-muted-foreground">
          {p.lastActiveAt
            ? new Date(p.lastActiveAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "never signed in"}
        </span>
      ),
    },
    {
      key: "device",
      header: "Device",
      sortValue: (p) => p.device,
      cell: (p) => <span className="text-xs text-muted-foreground">{p.device}</span>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-0",
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            title="Reset PIN"
            aria-label={`Reset PIN for ${p.name}`}
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
            disabled={pending || !p.signedIn}
            title={p.signedIn ? "Force sign out" : "Not signed in"}
            aria-label={`Force sign out ${p.name}`}
            onClick={() => run(() => forceLogout(p.id))}
          >
            <LogOut className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            title={p.status === "ACTIVE" ? "Disable player" : "Reactivate player"}
            aria-label={`${p.status === "ACTIVE" ? "Disable" : "Reactivate"} ${p.name}`}
            onClick={() =>
              run(() => setPlayerStatus(p.id, p.status === "ACTIVE" ? "DISABLED" : "ACTIVE"))
            }
          >
            {p.status === "ACTIVE" ? (
              <UserX className="size-3.5" />
            ) : (
              <UserCheck className="size-3.5" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={players}
      columns={columns}
      rowKey={(p) => p.id}
      searchPlaceholder="Search name, code or team"
      initialSort={{ key: "team", direction: "asc" }}
    />
  );
}
