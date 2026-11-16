import Link from "next/link";
import { Pin } from "lucide-react";
import { requireStudent } from "@/lib/auth/student";
import { prisma } from "@/lib/db";
import { noticesForStudent } from "@/lib/notices";
import { AppHeader } from "@/components/app-header";
import { StatusPill } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notices" };

export default async function NoticesPage() {
  const student = await requireStudent();
  const notices = await prisma.notice.findMany({
    where: noticesForStudent(student),
    include: { author: { select: { name: true } }, reads: { where: { studentId: student.id } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <>
      <AutoRefresh seconds={60} />
      <AppHeader title="Notices" subtitle="From your teachers and the office" name={student.name} profileHref="/profile" />
      <main className="mx-auto w-full max-w-lg px-5 py-5">
        {notices.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            No notices yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {notices.map((n) => {
              const unread = n.reads.length === 0;
              return (
                <li key={n.id}>
                  <Link
                    href={`/notices/${n.id}`}
                    className="block rounded-2xl border bg-surface p-4 outline-none transition-colors hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <div className="flex items-center gap-2">
                      {unread && <span className="size-2 shrink-0 rounded-full bg-info" aria-label="Unread" />}
                      {n.pinned && <Pin className="size-3.5 shrink-0 text-muted-foreground" aria-label="Pinned" />}
                      <p className={`min-w-0 flex-1 truncate ${unread ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {n.urgent && <StatusPill tone="danger">Urgent</StatusPill>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-2 text-xs text-faint-foreground">
                      {n.author.name} · {(n.scheduledFor ?? n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
