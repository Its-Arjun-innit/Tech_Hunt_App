"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill } from "@/components/status-badge";

export type ScanRow = {
  id: string;
  at: string;
  result: string;
  team: string;
  player: string;
  checkpoint: string;
  points: number;
  ip: string | null;
};
export type AdminRow = {
  id: string;
  at: string;
  actorType: string;
  action: string;
  actor: string | null;
  entity: string | null;
};
export type EventRow = { id: string; at: string; type: string; message: string };

const RESULT_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  SUCCESS: "success",
  DUPLICATE: "warning",
  RATE_LIMITED: "warning",
  WRONG_CHECKPOINT: "warning",
  INVALID_TOKEN: "danger",
  INACTIVE_CHECKPOINT: "danger",
  GAME_NOT_ACTIVE: "neutral",
  TEAM_DISABLED: "neutral",
};

/**
 * Filtering happens on the client over the last few hundred rows the server
 * already sent. Good enough for a campus game; if history grows past that this
 * should become a server query with pagination.
 */
export function AuditLog({
  scans,
  logs,
  events,
  defaultTab,
}: {
  scans: ScanRow[];
  logs: AdminRow[];
  events: EventRow[];
  defaultTab: string;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string>("");

  const q = query.trim().toLowerCase();
  const match = (...parts: (string | null)[]) =>
    !q || parts.some((p) => p?.toLowerCase().includes(q));

  const filteredScans = useMemo(
    () =>
      scans.filter(
        (s) => match(s.team, s.player, s.checkpoint, s.result) && (!result || s.result === result),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scans, q, result],
  );
  const filteredLogs = useMemo(
    () => logs.filter((l) => match(l.action, l.actor, l.entity)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, q],
  );
  const filteredEvents = useMemo(
    () => events.filter((e) => match(e.message, e.type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, q],
  );

  const results = [...new Set(scans.map((s) => s.result))].sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by team, player, checkpoint"
            className="h-9 pl-9"
          />
        </div>

        <select
          value={result}
          onChange={(e) => setResult(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter scans by result"
        >
          <option value="">All scan results</option>
          {results.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ").toLowerCase()}
            </option>
          ))}
        </select>

        {(query || result) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setQuery("");
              setResult("");
            }}
          >
            <X className="size-3.5" /> Clear
          </Button>
        )}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="scans">Scans ({filteredScans.length})</TabsTrigger>
          <TabsTrigger value="admin">Admin actions ({filteredLogs.length})</TabsTrigger>
          <TabsTrigger value="events">Game events ({filteredEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scans" className="space-y-1.5 pt-4">
          {filteredScans.map((s) => (
            <Row key={s.id} at={s.at} withSeconds>
              <StatusPill tone={RESULT_TONE[s.result] ?? "neutral"}>
                {s.result.replace(/_/g, " ").toLowerCase()}
              </StatusPill>
              <span className="font-medium">{s.team}</span>
              <span className="text-muted-foreground">/ {s.player}</span>
              <span className="truncate">{s.checkpoint}</span>
              {s.points > 0 && (
                <span className="font-medium text-success-strong">+{s.points}</span>
              )}
              {s.ip && (
                <span className="ml-auto shrink-0 text-xs text-faint-foreground">{s.ip}</span>
              )}
            </Row>
          ))}
          <Empty count={filteredScans.length} noun="scans" />
        </TabsContent>

        <TabsContent value="admin" className="space-y-1.5 pt-4">
          {filteredLogs.map((l) => (
            <Row key={l.id} at={l.at} full>
              <Badge variant="secondary" className="text-xs">
                {l.actorType.toLowerCase()}
              </Badge>
              <span className="font-medium">{l.action.replace(/_/g, " ").toLowerCase()}</span>
              {l.actor && <span className="truncate text-muted-foreground">by {l.actor}</span>}
              {l.entity && (
                <span className="text-xs text-faint-foreground">{l.entity}</span>
              )}
            </Row>
          ))}
          <Empty count={filteredLogs.length} noun="admin actions" />
        </TabsContent>

        <TabsContent value="events" className="space-y-1.5 pt-4">
          {filteredEvents.map((e) => (
            <Row key={e.id} at={e.at}>
              <Badge variant="outline" className="text-xs">
                {e.type.replace(/_/g, " ").toLowerCase()}
              </Badge>
              <span className="truncate">{e.message}</span>
            </Row>
          ))}
          <Empty count={filteredEvents.length} noun="game events" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  at,
  children,
  withSeconds,
  full,
}: {
  at: string;
  children: React.ReactNode;
  withSeconds?: boolean;
  full?: boolean;
}) {
  const d = new Date(at);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-sm">
      <span className="shrink-0 text-xs tabular-nums text-faint-foreground">
        {full
          ? d.toLocaleString()
          : d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              ...(withSeconds ? { second: "2-digit" } : {}),
            })}
      </span>
      {children}
    </div>
  );
}

function Empty({ count, noun }: { count: number; noun: string }) {
  if (count > 0) return null;
  return (
    <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
      No {noun} match these filters.
    </p>
  );
}
