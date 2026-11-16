import Link from "next/link";
import { AlertTriangle, Bell, ChevronRight, Clock, MapPin, ScanLine } from "lucide-react";
import { requireStudent } from "@/lib/auth/student";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { campusClock, formatIn, formatMin } from "@/lib/time";
import { classesBetween } from "@/lib/timetable/load";
import { nowAndNext } from "@/lib/timetable/resolve";
import { overall, studentStandings } from "@/lib/attendance/queries";
import { standingSentence } from "@/lib/attendance/stats";
import { noticesForStudent } from "@/lib/notices";
import { AppHeader } from "@/components/app-header";
import { AttendanceRing } from "@/components/attendance-ring";
import { AttendancePill, StatusPill } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

/**
 * Answers "where do I need to be" first: the class on now (with the Mark
 * button while its attendance is open), the next one, then the rest of the
 * day, attendance and unread notices.
 */
export default async function HomePage() {
  const student = await requireStudent();
  const clock = campusClock();
  const now = new Date();

  const [settings, [today], openSessions, unread] = await Promise.all([
    getSettings(),
    classesBetween({ sectionId: student.sectionId }, clock.dateKey),
    prisma.attendanceSession.findMany({
      where: { closesAt: { gt: now }, course: { sectionId: student.sectionId } },
      include: { records: { where: { studentId: student.id } }, course: { include: { subject: true } } },
    }),
    prisma.notice.findMany({
      where: { ...noticesForStudent(student), reads: { none: { studentId: student.id } } },
      orderBy: [{ urgent: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
  ]);
  const standings = await studentStandings(student, settings.minAttendancePct);
  const total = overall(standings, settings.minAttendancePct);
  const below = standings.filter((s) => s.below);

  const { now: current, next } = nowAndNext(today.classes, clock.minutes);
  const openFor = new Map(openSessions.map((s) => [s.courseId, s]));
  // A session can be opened outside the timetable (an extra class), so an
  // open session with no class on now still gets the Mark button.
  const unmarkedOpen = openSessions.filter((s) => s.records.length === 0);

  const first = student.name.split(" ")[0];

  return (
    <>
      <AutoRefresh seconds={30} />
      <AppHeader title={`Hi, ${first}`} subtitle={`${student.section.name} · ${student.rollNo}`} name={student.name} profileHref="/profile" />

      <main className="mx-auto w-full max-w-lg space-y-5 px-5 py-5">
        {unmarkedOpen.length > 0 && (
          <Link
            href="/mark"
            className="flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-md outline-none transition-transform active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ScanLine className="size-7 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Mark attendance</span>
              <span className="block truncate text-sm opacity-80">
                {unmarkedOpen.map((s) => s.course.subject.name).join(", ")} is open now
              </span>
            </span>
            <ChevronRight className="size-5" />
          </Link>
        )}

        {today.holiday ? (
          <Card>
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="mt-1 text-lg font-semibold">{today.holiday}</p>
            <p className="text-sm text-muted-foreground">Holiday, no classes.</p>
          </Card>
        ) : current ? (
          <Card>
            <div className="flex items-center justify-between gap-2">
              <StatusPill tone="info" icon={Clock}>
                Now · until {formatMin(current.endMin)}
              </StatusPill>
              {openFor.get(current.courseId)?.records[0] && (
                <AttendancePill status={openFor.get(current.courseId)!.records[0].status} />
              )}
            </div>
            <p className="mt-3 text-xl font-semibold">{current.subjectName}</p>
            <ClassMeta room={current.roomName} teacher={current.teacherName} />
          </Card>
        ) : null}

        {next && !today.holiday && (
          <Card>
            <p className="text-xs font-medium text-faint-foreground">
              Next · {formatMin(next.startMin)} · {formatIn(next.startMin - clock.minutes)}
            </p>
            <p className="mt-1 text-lg font-semibold">{next.subjectName}</p>
            <ClassMeta room={next.roomName} teacher={next.teacherName} />
            {next.changed && <p className="mt-2 text-sm text-warning-foreground dark:text-warning">Changed today{next.note ? `: ${next.note}` : ""}</p>}
          </Card>
        )}

        {!today.holiday && !current && !next && (
          <Card>
            <p className="font-medium">{today.classes.length ? "Done for today" : "No classes today"}</p>
            <p className="text-sm text-muted-foreground">Check the timetable for the rest of the week.</p>
          </Card>
        )}

        <Link href="/attendance" className="block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Card className="flex items-center gap-4">
            <AttendanceRing pct={total.pct} below={total.below} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-faint-foreground">Overall attendance</p>
              <p className="font-semibold">
                {total.attended} of {total.held} classes
              </p>
              {below.length > 0 ? (
                <p className="mt-0.5 flex items-start gap-1.5 text-sm text-danger">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Below {settings.minAttendancePct}% in {below.map((b) => b.subjectCode).join(", ")}
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">{standingSentence(total)}</p>
              )}
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>

        {today.classes.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Today</h2>
            <ol className="space-y-2">
              {today.classes.map((c) => {
                const record = openFor.get(c.courseId)?.records[0];
                const past = c.endMin <= clock.minutes;
                return (
                  <li
                    key={c.slotId}
                    className={`flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 ${past || c.cancelled ? "opacity-70" : ""}`}
                  >
                    <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{formatMin(c.startMin)}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-medium ${c.cancelled ? "line-through" : ""}`}>{c.subjectName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[c.roomName, c.teacherName].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {c.cancelled ? (
                      <StatusPill tone="danger">Cancelled</StatusPill>
                    ) : record ? (
                      <AttendancePill status={record.status} />
                    ) : c.changed ? (
                      <StatusPill tone="warning">Changed</StatusPill>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {unread.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Bell className="size-4" /> New notices
            </h2>
            <ul className="space-y-2">
              {unread.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/notices/${n.id}`}
                    className="flex items-center gap-2 rounded-xl border bg-surface px-3 py-2.5 text-sm outline-none hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {n.urgent && <StatusPill tone="danger">Urgent</StatusPill>}
                    <span className="min-w-0 flex-1 truncate font-medium">{n.title}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {standings.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Your section has no courses yet. They appear here once the office sets up the timetable.
          </p>
        )}
      </main>
    </>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-surface p-4 shadow-sm ${className}`}>{children}</div>;
}

function ClassMeta({ room, teacher }: { room: string | null; teacher: string }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {room && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" /> {room}
        </span>
      )}
      <span>{teacher}</span>
    </p>
  );
}
