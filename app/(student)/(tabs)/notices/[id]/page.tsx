import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { requireStudent } from "@/lib/auth/student";
import { prisma } from "@/lib/db";
import { noticesForStudent } from "@/lib/notices";
import { StatusPill } from "@/components/status-badge";
import { MarkRead } from "@/components/student/mark-read";

export const dynamic = "force-dynamic";

/** Opening a notice marks it read (from the browser, see MarkRead); the teacher's seen count comes from that. */
export default async function NoticePage({ params }: PageProps<"/notices/[id]">) {
  const student = await requireStudent();
  const { id } = await params;
  const notice = await prisma.notice.findFirst({
    where: { id, ...noticesForStudent(student) },
    include: { author: { select: { name: true } } },
  });
  if (!notice) notFound();

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-5">
      <MarkRead noticeId={notice.id} />
      <Link href="/notices" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Notices
      </Link>
      <article className="mt-2">
        {notice.urgent && <StatusPill tone="danger">Urgent</StatusPill>}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{notice.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {notice.author.name} ·{" "}
          {(notice.scheduledFor ?? notice.createdAt).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
            timeZone: process.env.CAMPUS_TZ || "Asia/Kolkata",
          })}
        </p>
        <p className="mt-5 whitespace-pre-wrap leading-relaxed">{notice.body}</p>
        {notice.attachmentUrl && (
          <a
            href={notice.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted"
          >
            <ExternalLink className="size-4" /> Open attachment
          </a>
        )}
      </article>
    </main>
  );
}
