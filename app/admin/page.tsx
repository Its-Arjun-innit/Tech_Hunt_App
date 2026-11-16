import Link from "next/link";
import { AlertTriangle, BookOpen, CalendarCheck, GraduationCap, Radio, UserRound } from "lucide-react";
import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { campusClock, dateFromKey, formatDateKey, keyFromDate } from "@/lib/time";
import { PageHeader } from "@/components/admin/page-header";
import { Stat } from "@/components/ui/stat";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requireStaff("ADMIN");
  const today = campusClock().dateKey;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [students, staff, courses, slots, sessionsToday, open, flagged] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.staff.count({ where: { active: true } }),
    prisma.course.count(),
    prisma.timetableSlot.count(),
    prisma.attendanceSession.count({ where: { date: dateFromKey(today) } }),
    prisma.attendanceSession.findMany({
      where: { closesAt: { gt: now } },
      include: { course: { include: { subject: true, section: true } }, openedBy: { select: { name: true } }, _count: { select: { records: true } } },
    }),
    prisma.attendanceRecord.findMany({
      where: { flagged: true, createdAt: { gte: weekAgo } },
      include: { student: true, session: { include: { course: { include: { subject: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  if (courses === 0 || slots === 0) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader title="Get set up" description="Five steps before students can mark attendance." />
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li><Link className="underline" href="/admin/structure">Add departments, sections and subjects</Link></li>
          <li><Link className="underline" href="/admin/rooms">Add rooms</Link> (stand in each one and press “Use my location”)</li>
          <li><Link className="underline" href="/admin/staff">Add teachers</Link> and <Link className="underline" href="/admin/students">import students</Link></li>
          <li><Link className="underline" href="/admin/courses">Assign who teaches what</Link></li>
          <li><Link className="underline" href="/admin/timetable">Build the weekly timetable</Link></li>
        </ol>
        <EmptyState icon={CalendarCheck} title="Nothing scheduled yet" description="The overview fills in once classes are on the timetable." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <AutoRefresh seconds={20} showIndicator />
      <PageHeader title="Overview" description={formatDateKey(today)} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Students" value={students} icon={GraduationCap} />
        <Stat label="Staff" value={staff} icon={UserRound} />
        <Stat label="Courses" value={courses} icon={BookOpen} />
        <Stat label="Classes marked today" value={sessionsToday} icon={CalendarCheck} />
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <Radio className="size-4" /> Marking now
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">No class has attendance open.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {open.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  {s.course.subject.name} · {s.course.section.name} · {s.openedBy.name}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-muted-foreground">{s._count.records} marked</span>
                  <Button size="sm" variant="outline" render={<Link href={`/teacher/session/${s.id}`} />}>
                    View
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <AlertTriangle className="size-4" /> Flagged marks this week
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">Accepted, but the phone was outside the room radius or did not share a location.</p>
        {flagged.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {flagged.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{r.student.rollNo}</span> {r.student.name} ·{" "}
                  {r.session.course.subject.code} · {formatDateKey(keyFromDate(r.session.date))}
                </span>
                <Link href={`/teacher/session/${r.sessionId}`} className="text-warning-foreground underline-offset-4 hover:underline dark:text-warning">
                  {r.flagReason}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
