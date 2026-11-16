import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Radio } from "lucide-react";
import { requireStudent } from "@/lib/auth/student";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ATTENDED, standing, standingSentence } from "@/lib/attendance/stats";
import { formatDateKey, keyFromDate } from "@/lib/time";
import { AttendanceRing } from "@/components/attendance-ring";
import { AttendancePill, StatusPill } from "@/components/status-badge";

export const dynamic = "force-dynamic";

/** Every class of one subject, newest first, with what was recorded. */
export default async function CourseHistory({ params }: PageProps<"/attendance/[courseId]">) {
  const student = await requireStudent();
  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { id: courseId, sectionId: student.sectionId },
    include: { subject: true, teacher: { select: { name: true } } },
  });
  if (!course) notFound();

  const now = new Date();
  const [{ minAttendancePct }, sessions] = await Promise.all([
    getSettings(),
    prisma.attendanceSession.findMany({
      where: { courseId, openedAt: { lte: now } },
      include: { records: { where: { studentId: student.id } } },
      orderBy: { openedAt: "desc" },
    }),
  ]);
  const attended = sessions.filter((s) => s.records[0] && (ATTENDED as readonly string[]).includes(s.records[0].status)).length;
  const st = standing(attended, sessions.length, minAttendancePct);

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-5">
      <Link href="/attendance" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Attendance
      </Link>

      <div className="mt-2 flex items-center gap-4">
        <AttendanceRing pct={st.pct} below={st.below} size={80} />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{course.subject.name}</h1>
          <p className="text-sm text-muted-foreground">
            {course.subject.code} · {course.teacher.name}
          </p>
          <p className={`mt-1 text-sm ${st.below ? "font-medium text-danger" : ""}`}>{standingSentence(st)}</p>
        </div>
      </div>

      <ol className="mt-6 divide-y rounded-2xl border bg-surface">
        {sessions.map((s) => {
          const open = s.closesAt > now;
          const record = s.records[0];
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{formatDateKey(keyFromDate(s.date))}</p>
                <p className="text-xs text-muted-foreground">
                  {s.openedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: process.env.CAMPUS_TZ || "Asia/Kolkata" })}
                </p>
              </div>
              {record ? (
                <AttendancePill status={record.status} />
              ) : open ? (
                <StatusPill tone="info" icon={Radio}>
                  Open now
                </StatusPill>
              ) : (
                <AttendancePill status="ABSENT" />
              )}
            </li>
          );
        })}
        {sessions.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No classes held yet.</li>}
      </ol>
    </main>
  );
}
