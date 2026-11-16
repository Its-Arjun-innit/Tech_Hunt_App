import { Eye, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { noticeReach } from "@/lib/notices-server";
import { StatusPill } from "@/components/status-badge";
import { deleteNotice } from "@/app/teacher/actions";

/** Posted notices with their reach: "seen by 31 of 60". */
export async function NoticeList({ where, showAuthor = false }: { where: Prisma.NoticeWhereInput; showAuthor?: boolean }) {
  const notices = await prisma.notice.findMany({
    where,
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (notices.length === 0) {
    return <p className="rounded-2xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">Nothing posted yet.</p>;
  }
  const reach = await noticeReach(notices);
  const now = new Date();

  return (
    <ul className="space-y-2">
      {notices.map((n) => {
        const r = reach.get(n.id)!;
        const scheduled = n.scheduledFor && n.scheduledFor > now;
        return (
          <li key={n.id} className="rounded-2xl border bg-surface p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  To {r.label}
                  {showAuthor ? ` · ${n.author.name}` : ""} ·{" "}
                  {(n.scheduledFor ?? n.createdAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: process.env.CAMPUS_TZ || "Asia/Kolkata",
                  })}
                </p>
              </div>
              <form action={deleteNotice.bind(null, n.id)}>
                <button
                  type="submit"
                  aria-label={`Delete notice: ${n.title}`}
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </form>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {scheduled ? (
                <StatusPill tone="info">Scheduled</StatusPill>
              ) : (
                <StatusPill tone="neutral" icon={Eye}>
                  Seen by {r.seen} of {r.audience}
                </StatusPill>
              )}
              {n.urgent && <StatusPill tone="danger">Urgent</StatusPill>}
              {n.pinned && <StatusPill tone="neutral">Pinned</StatusPill>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
