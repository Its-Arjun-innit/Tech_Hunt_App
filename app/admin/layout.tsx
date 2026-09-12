import Link from "next/link";
import { Compass } from "lucide-react";
import { getAdmin } from "@/lib/auth/admin";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminTopBar } from "@/components/admin/top-bar";

export const metadata = { title: "Admin — Campus Treasure Hunt" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getAdmin();

  // The login page renders inside this layout but has no session yet.
  if (!admin) return <>{children}</>;

  const game = await getCurrentGame();
  const pendingVerifications = game
    ? await prisma.challengeAttempt.count({
        where: { status: "PENDING", team: { gameId: game.id } },
      })
    : 0;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex flex-col border-b bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight">Campus Hunt</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">
              Organizer console
            </span>
          </span>
        </Link>

        <AdminNav />

        <div className="mt-auto hidden border-t px-4 py-3 lg:block">
          <p className="truncate text-[11px] text-muted-foreground" title={admin.email}>
            {admin.email}
          </p>
          <p className="text-[11px] text-faint-foreground">
            {admin.role.replace("_", " ").toLowerCase()}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar
          game={
            game
              ? {
                  name: game.name,
                  status: game.status,
                  startsAt: game.startsAt?.toISOString() ?? null,
                  endsAt: game.endsAt?.toISOString() ?? null,
                }
              : null
          }
          adminEmail={admin.email}
          pendingVerifications={pendingVerifications}
        />
        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
