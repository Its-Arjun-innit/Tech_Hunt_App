"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, ClipboardList, Flag, Gamepad2, LayoutDashboard, Map, Puzzle,
  QrCode, Route, Users, type LucideIcon,
} from "lucide-react";
import { isActiveNav } from "@/lib/nav";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
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

export function AdminNav() {
  const pathname = usePathname();

  return (
    // On phones this is a horizontal strip; the mask hints that it scrolls.
    <nav
      aria-label="Admin sections"
      className="p-2 flex lg:flex-col gap-1 overflow-x-auto snap-x scroll-px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:[mask-image:none] [mask-image:linear-gradient(to_right,transparent,black_8px,black_calc(100%-16px),transparent)]"
    >
      {NAV.map((item) => {
        const active = isActiveNav(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
