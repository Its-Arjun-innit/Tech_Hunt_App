import Link from "next/link";
import { Bell, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill, gameStatusTone } from "@/components/status-badge";
import { GameTimer } from "@/components/player/game-timer";
import { adminLogout } from "@/app/admin/login/actions";

/**
 * Always-visible game state.
 *
 * The brief's admin priority order starts with game status, so it lives in the
 * chrome rather than on one dashboard. An organizer on the audit log still
 * knows at a glance whether the game is live and how long is left.
 */
export function AdminTopBar({
  game,
  adminEmail,
  pendingVerifications,
}: {
  game: {
    name: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
  } | null;
  adminEmail: string;
  pendingVerifications: number;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
      {game ? (
        <>
          <StatusPill
            tone={gameStatusTone(game.status)}
            icon={game.status === "ACTIVE" ? Radio : undefined}
          >
            {game.status === "ACTIVE" ? "Game live" : game.status.toLowerCase()}
          </StatusPill>

          <span className="hidden min-w-0 truncate text-sm font-medium sm:block">
            {game.name}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <GameTimer
              status={game.status}
              startsAt={game.startsAt}
              endsAt={game.endsAt}
              compact
            />

            {pendingVerifications > 0 && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/admin/challenges" />}
                title={`${pendingVerifications} submission${pendingVerifications === 1 ? "" : "s"} awaiting a volunteer`}
              >
                <Bell className="size-3.5" />
                {pendingVerifications}
              </Button>
            )}

            <span className="hidden text-xs text-muted-foreground xl:block">{adminEmail}</span>

            <form action={adminLogout}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </>
      ) : (
        <>
          <StatusPill tone="neutral">No game</StatusPill>
          <div className="ml-auto">
            <form action={adminLogout}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </>
      )}
    </header>
  );
}
