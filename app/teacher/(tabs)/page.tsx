import Link from "next/link";
import { ChevronRight, MapPin, Play, Radio, Shield } from "lucide-react";
import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { campusClock, dateFromKey, formatDateKey, formatMin } from "@/lib/time";
import { classesBetween } from "@/lib/timetable/load";
import { ATTENDED } from "@/lib/attendance/stats";
import { AppHeader } from "@/components/app-header";
import { StatusPill } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { AutoRefresh } from "@/components/auto-refresh";
import { startSession } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today" };

/** A class can be started from 10 minutes before it begins until it ends. */
const EARLY_MIN = 10;

export default async function TeacherToday() {
  const staff = await requireStaff();
  const clock = campusClock();
  const now = new Date();

  const [[today], sessions, myCourses] = await Promise.all([
    classesBetween({ teacherId: staff.id }, clock.dateKey),
    prisma.attendanceSession.findMany({
      where: { date: dateFromKey(clock.dateKey), OR: [{ openedById: staff.id }, { course: { teacherId: staff.id } }] },
      include: {
        course: { include: { subject: true, section: { include: { _count: { select: { students: true } } } } } },
        _count: { select: { records: { where: { status: { in: [...ATTENDED] } } } } },
      },
      orderBy: { openedAt: "desc" },
    }),
    prisma.course.findMany({
      where: { teacherId: staff.id },
      include: { subject: true, section: true },
      orderBy: [{ section: { name: "asc" } }, { subject: { code: "asc" } }],
    }),
  ]);

  const sessionFor = (slotId: string, courseId: string) =>
    sessions.find((s) => s.slotId === slotId) ?? sessions.find((s) => !s.slotId && s.courseId === courseId && s.closesAt > now);
  const extra = sessions.filter((s) => !s.slotId);

  return (
    <>
      <AutoRefresh seconds={30} />
      <AppHeader title="Today" subtitle={formatDateKey(clock.dateKey)} name={staff.name} profileHref="/teacher/profile" />
      <main className="mx-auto w-full max-w-lg space-y-5 px-5 py-5">
        {staff.role === "ADMIN" && (
          <Link href="/admin" className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm hover:bg-muted">
            <Shield className="size-4" /> Open the admin console <ChevronRight className="ml-auto size-4" />
          </Link>
        )}

        {today.holiday ? (
          <p className="rounded-2xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">{today.holiday} — no classes.</p>
        ) : today.classes.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">No classes on your timetable today.</p>
        ) : (
          <ol className="space-y-2">
            {today.classes.map((c) => {
              const session = sessionFor(c.slotId, c.courseId);
              const open = session && session.closesAt > now;
              const total = session?.course.section._count.students ?? 0;
              const handedOver = c.teacherId !== staff.id;
              const startable = !c.cancelled && !handedOver && clock.minutes >= c.startMin - EARLY_MIN && clock.minutes < c.endMin;
              const isNow = clock.minutes >= c.startMin && clock.minutes < c.endMin;
              return (
                <li key={c.slotId} className={`rounded-2xl border bg-surface p-4 ${isNow && !c.cancelled ? "border-primary/60 shadow-sm" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatMin(c.startMin)} – {formatMin(c.endMin)}
                      </p>
                      <p className={`mt-0.5 font-semibold ${c.cancelled ? "line-through" : ""}`}>{c.subjectName}</p>
                      <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                        <span>{c.sectionName}</span>
                        {c.roomName && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" /> {c.roomName}
                          </span>
                        )}
                      </p>
                    </div>
                    {c.cancelled ? (
                      <StatusPill tone="danger">Cancelled</StatusPill>
                    ) : handedOver ? (
                      <StatusPill tone="neutral">Covered by {c.teacherName}</StatusPill>
                    ) : c.regularTeacherId !== staff.id ? (
                      <StatusPill tone="info">You&apos;re covering</StatusPill>
                    ) : c.changed ? (
                      <StatusPill tone="warning">Changed</StatusPill>
                    ) : null}
                  </div>

                  {session ? (
                    <Button
                      variant={open ? "default" : "outline"}
                      className="mt-3 h-11 w-full"
                      render={<Link href={`/teacher/session/${session.id}`} />}
                    >
                      {open ? <Radio className="size-4" /> : null}
                      {open ? "Attendance open" : "Attendance taken"} · {session._count.records}/{total}
                    </Button>
                  ) : startable ? (
                    <form action={startSession.bind(null, c.courseId, c.slotId)} className="mt-3">
                      <Button type="submit" className="h-11 w-full">
                        <Play className="size-4" /> Start attendance
                      </Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {extra.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Extra classes today</h2>
            <ul className="space-y-2">
              {extra.map((s) => (
                <li key={s.id}>
                  <Link href={`/teacher/session/${s.id}`} className="flex items-center justify-between rounded-xl border bg-surface px-3 py-2.5 text-sm hover:border-border-strong">
                    <span>
                      {s.course.subject.name} · {s.course.section.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {s._count.records}/{s.course.section._count.students}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {myCourses.length > 0 && (
          <details className="rounded-2xl border bg-surface p-4">
            <summary className="cursor-pointer text-sm font-semibold">Take attendance for an extra class</summary>
            <form
              action={async (fd: FormData) => {
                "use server";
                await startSession(String(fd.get("courseId")), null);
              }}
              className="mt-3 space-y-2"
            >
              <NativeSelect name="courseId" required aria-label="Class" className="h-11">
                {myCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subject.name} · {c.section.name}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">Extra classes have no room, so location is not checked. The rotating code still is.</p>
              <Button type="submit" variant="outline" className="h-11 w-full">
                <Play className="size-4" /> Start
              </Button>
            </form>
          </details>
        )}
      </main>
    </>
  );
}
