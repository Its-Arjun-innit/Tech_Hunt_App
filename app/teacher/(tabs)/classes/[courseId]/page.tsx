import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { courseForStaff, requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { courseRoster } from "@/lib/attendance/queries";
import { ATTENDED } from "@/lib/attendance/stats";
import { campusClock, DAY_SHORT, formatDateKey, formatMin, keyFromDate } from "@/lib/time";
import { AttendanceRing } from "@/components/attendance-ring";
import { StatusPill } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { changeClass } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function CourseReport({ params }: PageProps<"/teacher/classes/[courseId]">) {
  const staff = await requireStaff();
  const { courseId } = await params;
  const course = await courseForStaff(staff, courseId);
  if (!course) notFound();

  const { minAttendancePct } = await getSettings();
  const [roster, sessions, slots, rooms, teachers] = await Promise.all([
    courseRoster(courseId, minAttendancePct),
    prisma.attendanceSession.findMany({
      where: { courseId },
      include: { _count: { select: { records: { where: { status: { in: [...ATTENDED] } } } } }, records: { where: { flagged: true }, select: { id: true } } },
      orderBy: { openedAt: "desc" },
      take: 30,
    }),
    prisma.timetableSlot.findMany({ where: { courseId }, orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }] }),
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.staff.findMany({ where: { active: true, id: { not: staff.id } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const defaulters = roster.filter((r) => r.below).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
  const avg = roster.length && sessions.length ? Math.round(roster.reduce((n, r) => n + (r.pct ?? 0), 0) / roster.length) : null;

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 px-5 py-5">
      <div>
        <Link href="/teacher/classes" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Classes
        </Link>
        <div className="flex items-center gap-4">
          <AttendanceRing pct={avg} below={avg !== null && avg < minAttendancePct} size={72} />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{course.subject.name}</h1>
            <p className="text-sm text-muted-foreground">
              {course.section.name} · {sessions.length} classes held · class average
            </p>
          </div>
        </div>
        <Button variant="outline" className="mt-4 h-11 w-full" render={<a href={`/teacher/classes/${courseId}/export`} />}>
          <Download className="size-4" /> Download register (CSV)
        </Button>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">
          Below {minAttendancePct}% <span className="font-normal text-muted-foreground">· {defaulters.length}</span>
        </h2>
        {defaulters.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone is at or above the minimum.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-surface">
            {defaulters.map((r) => (
              <li key={r.studentId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{r.rollNo}</span>
                </span>
                <span className="text-right">
                  <StatusPill tone="danger">{r.pct}%</StatusPill>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {r.attended}/{r.held} · needs {r.mustAttend}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Recent classes</h2>
        <ul className="divide-y rounded-2xl border bg-surface">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/teacher/session/${s.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/40">
                <span>{formatDateKey(keyFromDate(s.date))}</span>
                <span className="flex items-center gap-2">
                  {s.records.length > 0 && <StatusPill tone="warning">{s.records.length} flagged</StatusPill>}
                  <span className="tabular-nums text-muted-foreground">
                    {s._count.records}/{roster.length}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {sessions.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No classes held yet.</li>}
        </ul>
      </section>

      {slots.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold">Cancel or change a class</h2>
          <p className="mb-3 text-sm text-muted-foreground">The section gets a notice automatically.</p>
          <ActionForm action={changeClass} className="space-y-3 rounded-2xl border bg-surface p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required defaultValue={campusClock().dateKey} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slotId">Class</Label>
                <NativeSelect id="slotId" name="slotId" required className="h-11">
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {DAY_SHORT[s.dayOfWeek]} {formatMin(s.startMin)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kind">What&apos;s happening</Label>
              <NativeSelect id="kind" name="kind" className="h-11">
                <option value="CANCEL">Cancel this class</option>
                <option value="CHANGE">Change time, room or teacher</option>
                <option value="RESTORE">Undo a change (back to normal)</option>
              </NativeSelect>
            </div>
            <fieldset className="space-y-2 rounded-xl bg-muted/40 p-3">
              <legend className="px-1 text-xs text-muted-foreground">For a change only — leave blank to keep as usual</legend>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start">Starts</Label>
                  <Input id="start" name="start" type="time" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end">Ends</Label>
                  <Input id="end" name="end" type="time" className="h-11" />
                </div>
              </div>
              <NativeSelect name="roomId" aria-label="Room" className="h-11">
                <option value="">Usual room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect name="substituteId" aria-label="Substitute teacher" className="h-11">
                <option value="">Taught by me</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    Substitute: {t.name}
                  </option>
                ))}
              </NativeSelect>
            </fieldset>
            <Input name="note" placeholder="Note for students (optional)" maxLength={200} className="h-11" />
            <SubmitButton className="h-11 w-full">Save and notify section</SubmitButton>
          </ActionForm>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">All students</h2>
        <ul className="divide-y rounded-2xl border bg-surface">
          {roster.map((r) => (
            <li key={r.studentId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-2 font-mono text-xs text-muted-foreground">{r.rollNo}</span>
                {r.name}
              </span>
              <span className={`tabular-nums ${r.below ? "font-semibold text-danger" : "text-muted-foreground"}`}>
                {r.pct === null ? "—" : `${r.pct}%`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
