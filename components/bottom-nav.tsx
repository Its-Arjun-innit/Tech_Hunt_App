"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, CalendarDays, Home, ListChecks, ScanLine, Sun } from "lucide-react";

type Tab = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number };

/**
 * Thumb-reachable navigation for the two phone apps.
 *
 * Students get a raised centre Mark button: marking attendance is the action
 * done most, under time pressure, so it is one tap from every tab.
 */
export function BottomNav({ variant, unread = 0 }: { variant: "student" | "teacher"; unread?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "teacher") {
    const tabs: Tab[] = [
      { href: "/teacher", label: "Today", icon: Sun },
      { href: "/teacher/classes", label: "Classes", icon: BookOpen },
      { href: "/teacher/notices", label: "Notices", icon: Bell },
    ];
    return (
      <Bar cols="grid-cols-3">
        {tabs.map((t) => (
          <TabLink
            key={t.href}
            {...t}
            active={t.href === "/teacher" ? pathname === "/teacher" || pathname.startsWith("/teacher/session") : isActive(t.href)}
          />
        ))}
      </Bar>
    );
  }

  const left: Tab[] = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/timetable", label: "Timetable", icon: CalendarDays },
  ];
  const right: Tab[] = [
    { href: "/attendance", label: "Attendance", icon: ListChecks },
    { href: "/notices", label: "Notices", icon: Bell, badge: unread },
  ];
  const marking = isActive("/mark");

  return (
    <Bar cols="grid-cols-5">
      {left.map((t) => (
        <TabLink key={t.href} {...t} active={isActive(t.href)} />
      ))}
      <Link
        href="/mark"
        aria-current={marking ? "page" : undefined}
        className="group -mt-6 flex flex-col items-center gap-1 outline-none"
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform group-active:scale-95 group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
          <ScanLine className="size-7" />
        </span>
        <span className="text-[11px] font-semibold">Mark</span>
      </Link>
      {right.map((t) => (
        <TabLink key={t.href} {...t} active={isActive(t.href)} />
      ))}
    </Bar>
  );
}

function Bar({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-safe backdrop-blur print:hidden">
      <div className={`mx-auto grid max-w-lg items-end px-2 pt-1.5 ${cols}`}>{children}</div>
    </nav>
  );
}

function TabLink({ href, label, icon: Icon, active, badge }: Tab & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="relative">
        <Icon className="size-5" />
        {!!badge && (
          <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-danger-foreground">
            {badge > 9 ? "9+" : badge}
            <span className="sr-only"> unread</span>
          </span>
        )}
      </span>
      {label}
      <span className={`h-0.5 w-6 rounded-full transition-colors ${active ? "bg-primary" : "bg-transparent"}`} />
    </Link>
  );
}
