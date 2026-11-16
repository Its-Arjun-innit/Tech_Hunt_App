import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminTopBar } from "@/components/admin/top-bar";

export const metadata = { title: { default: "Admin", template: "%s — Campus admin" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff("ADMIN");
  const openSessions = await prisma.attendanceSession.count({ where: { closesAt: { gt: new Date() } } });

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex flex-col border-b bg-sidebar print:hidden lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
        <Link href="/admin" className="flex items-center gap-2 px-4 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight">Campus</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">College office</span>
          </span>
        </Link>
        <AdminNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar email={staff.email} openSessions={openSessions} />
        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
