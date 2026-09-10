import Link from "next/link";
import {
  Bell, ClipboardList, Flag, Gamepad2, LayoutDashboard, Map, Puzzle,
  QrCode, Route, ShieldCheck, Users,
} from "lucide-react";
import { getAdmin } from "@/lib/auth/admin";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminLogout } from "./login/actions";

export const metadata = { title: "Admin — Campus Treasure Hunt" };

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/game", label: "Game controls", icon: Gamepad2 },
  { href: "/admin/teams", label: "Teams & players", icon: Users },
  { href: "/admin/checkpoints", label: "Checkpoints", icon: Flag },
  { href: "/admin/map", label: "Live map", icon: Map },
  { href: "/admin/routing", label: "Routing", icon: Route },
  { href: "/admin/challenges", label: "Challenges", icon: Puzzle },
  { href: "/admin/qr", label: "QR posters", icon: QrCode },
  { href: "/admin/announcements", label: "Announcements", icon: Bell },
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getAdmin();

  // The login page renders inside this layout but has no session yet.
  if (!admin) return <>{children}</>;

  const game = await getCurrentGame();

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      <aside className="lg:w-60 lg:shrink-0 border-b lg:border-b-0 lg:border-r lg:min-h-screen">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5" /> Organizer
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{admin.email}</p>
          {game && (
            <Badge variant="outline" className="mt-2 text-xs font-normal">
              {game.name} · {game.status}
            </Badge>
          )}
        </div>

        <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-muted"
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-2 lg:mt-auto">
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
