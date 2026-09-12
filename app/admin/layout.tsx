import { ShieldCheck } from "lucide-react";
import { getAdmin } from "@/lib/auth/admin";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminNav } from "@/components/admin/admin-nav";
import { adminLogout } from "./login/actions";

export const metadata = { title: "Admin — Campus Treasure Hunt" };

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-success-subtle text-success-strong border-success/30",
  PAUSED: "bg-warning-subtle text-warning-foreground border-warning/40 dark:text-warning",
  ENDED: "bg-muted text-muted-foreground",
  DRAFT: "bg-muted text-muted-foreground",
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getAdmin();

  // The login page renders inside this layout but has no session yet.
  if (!admin) return <>{children}</>;

  const game = await getCurrentGame();

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* flex-col so sign-out can sit at the bottom; sticky so the nav
          survives long pages such as the audit log. */}
      <aside className="lg:w-60 lg:shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r lg:sticky lg:top-0 lg:h-screen">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5" /> Organizer
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate" title={admin.email}>
            {admin.email}
          </p>
          {game && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium truncate" title={game.name}>
                {game.name}
              </p>
              <Badge
                variant="outline"
                className={`text-xs font-normal ${STATUS_CLASS[game.status] ?? ""}`}
              >
                {game.status}
              </Badge>
            </div>
          )}
        </div>

        <AdminNav />

        <div className="p-2 mt-auto border-t lg:border-t-0">
          <form action={adminLogout}>
            <Button variant="ghost" size="sm" type="submit" className="w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-5 lg:p-8">{children}</main>
    </div>
  );
}
