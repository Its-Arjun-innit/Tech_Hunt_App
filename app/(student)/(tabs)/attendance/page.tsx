import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireStudent } from "@/lib/auth/student";
import { getSettings } from "@/lib/settings";
import { overall, studentStandings } from "@/lib/attendance/queries";
import { standingSentence } from "@/lib/attendance/stats";
import { AppHeader } from "@/components/app-header";
import { AttendanceRing } from "@/components/attendance-ring";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const student = await requireStudent();
  const { minAttendancePct } = await getSettings();
  const rows = await studentStandings(student, minAttendancePct);
  const total = overall(rows, minAttendancePct);
  // Worst first: the subject that needs attention is the one to see.
  const sorted = [...rows].sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));

  return (
    <>
      <AppHeader title="Attendance" subtitle={`Minimum ${minAttendancePct}%`} name={student.name} profileHref="/profile" />
      <main className="mx-auto w-full max-w-lg space-y-4 px-5 py-5">
        <div className="flex items-center gap-4 rounded-2xl border bg-surface p-4 shadow-sm">
          <AttendanceRing pct={total.pct} below={total.below} size={88} />
          <div>
            <p className="text-xs font-medium text-faint-foreground">All subjects</p>
            <p className="text-lg font-semibold">
              {total.attended} / {total.held} classes
            </p>
            <p className="text-sm text-muted-foreground">{standingSentence(total)}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {sorted.map((r) => (
            <li key={r.courseId}>
              <Link
                href={`/attendance/${r.courseId}`}
                className="flex items-center gap-3 rounded-2xl border bg-surface p-3 outline-none transition-colors hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <AttendanceRing pct={r.pct} below={r.below} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.attended}/{r.held} · {r.teacherName}
                  </p>
                  <p className={`mt-0.5 text-sm ${r.below ? "font-medium text-danger" : "text-muted-foreground"}`}>
                    {standingSentence(r)}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
        {rows.length === 0 && <p className="text-center text-sm text-muted-foreground">No courses yet.</p>}
      </main>
    </>
  );
}
