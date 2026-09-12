"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, ClipboardList, Flag, Gamepad2, HandHelping, LayoutDashboard, Map, Puzzle,
  QrCode, Route, Sliders, Trophy, UserRound, Users, type LucideIcon,
} from "lucide-react";
import { isActiveNav } from "@/lib/nav";

/** Grouped so the console reads as monitor / manage / configure. */
const GROUPS: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Monitor",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/map", label: "Live game", icon: Map },
      { href: "/admin/routing", label: "Routing", icon: Route },
      { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/teams", label: "Teams", icon: Users },
      { href: "/admin/players", label: "Players", icon: UserRound },
      { href: "/admin/volunteers", label: "Volunteers", icon: HandHelping },
      { href: "/admin/announcements", label: "Announcements", icon: Bell },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/admin/checkpoints", label: "Checkpoints", icon: Flag },
      { href: "/admin/challenges", label: "Challenges", icon: Puzzle },
      { href: "/admin/qr", label: "QR posters", icon: QrCode },
      { href: "/admin/game", label: "Game controls", icon: Gamepad2 },
      { href: "/admin/settings", label: "Settings", icon: Sliders },
      { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0 lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_8px,black_calc(100%-16px),transparent)] lg:[mask-image:none]"
    >
      {GROUPS.map((group) => (
        <div key={group.label} className="flex shrink-0 gap-1 lg:mt-3 lg:flex-col lg:gap-0.5 lg:first:mt-0">
          <p className="hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint-foreground lg:block">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActiveNav(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  active
                    ? "bg-sidebar-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
                {active && (
                  <span
                    aria-hidden
                    className="ml-auto hidden h-4 w-0.5 rounded-full bg-primary lg:block"
                  />
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
