"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, BookOpen, Building2, CalendarDays, CalendarOff, ClipboardList, DoorOpen, GraduationCap, LayoutDashboard,
  PieChart, Sliders, UserRound, type LucideIcon,
} from "lucide-react";
import { isActiveNav } from "@/lib/nav";

/** Grouped so the console reads as monitor / people / plan / configure. */
const GROUPS: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Monitor",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/reports", label: "Attendance", icon: PieChart },
      { href: "/admin/notices", label: "Notices", icon: Bell },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/students", label: "Students", icon: GraduationCap },
      { href: "/admin/staff", label: "Staff", icon: UserRound },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/admin/courses", label: "Courses", icon: BookOpen },
      { href: "/admin/timetable", label: "Timetable", icon: CalendarDays },
      { href: "/admin/calendar", label: "Holidays", icon: CalendarOff },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/admin/structure", label: "Departments", icon: Building2 },
      { href: "/admin/rooms", label: "Rooms", icon: DoorOpen },
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
      className="flex gap-1 overflow-x-auto p-2 [mask-image:linear-gradient(to_right,transparent,black_8px,black_calc(100%-16px),transparent)] [scrollbar-width:none] lg:flex-col lg:gap-0 lg:overflow-y-auto lg:[mask-image:none] [&::-webkit-scrollbar]:hidden"
    >
      {GROUPS.map((group) => (
        <div key={group.label} className="flex shrink-0 gap-1 lg:mt-3 lg:flex-col lg:gap-0.5 lg:first:mt-0">
          <p className="hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint-foreground lg:block">{group.label}</p>
          {group.items.map((item) => {
            const active = isActiveNav(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  active ? "bg-sidebar-accent font-medium text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
                {active && <span aria-hidden className="ml-auto hidden h-4 w-0.5 rounded-full bg-primary lg:block" />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
