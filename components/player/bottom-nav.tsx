"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, QrCode, Users } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/team", label: "Team", icon: Users },
  { href: "/activity", label: "Activity", icon: Activity },
] as const;

/**
 * Thumb-reachable navigation. SCAN is raised and centred because it is the
 * one action the whole game runs on; everything else is secondary.
 */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const scanning = isActive("/scan");

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur pb-safe"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 items-end px-2 pt-1.5">
        <Tab {...TABS[0]} active={isActive(TABS[0].href)} />
        <Tab {...TABS[1]} active={isActive(TABS[1].href)} />

        {/* Raised primary action, sitting above the bar. */}
        <Link
          href="/scan"
          aria-current={scanning ? "page" : undefined}
          className="group -mt-6 flex flex-col items-center gap-1 outline-none"
        >
          <span
            className={`flex size-14 items-center justify-center rounded-2xl shadow-lg transition-transform group-active:scale-95 group-focus-visible:ring-3 group-focus-visible:ring-ring/50 ${
              scanning
                ? "bg-primary text-primary-foreground ring-2 ring-primary"
                : "bg-primary text-primary-foreground"
            }`}
          >
            <QrCode className="size-7" />
          </span>
          <span className="text-[11px] font-semibold">Scan</span>
        </Link>

        <Tab {...TABS[2]} active={isActive(TABS[2].href)} />
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-5" />
      {label}
      <span
        className={`h-0.5 w-6 rounded-full transition-colors ${
          active ? "bg-primary" : "bg-transparent"
        }`}
      />
    </Link>
  );
}
