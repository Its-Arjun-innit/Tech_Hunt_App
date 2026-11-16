import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, Lock, Plus } from "lucide-react";
import { requireStaff, courseForStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { campusClock, formatDateKey, keyFromDate } from "@/lib/time";
import { ATTENDED } from "@/lib/attendance/stats";
import { AttendancePill, StatusPill } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { LiveCode } from "@/components/teacher/live-code";
import { Button } from "@/components/ui/button";
import { closeSession, extendSession, setRecordStatus } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance" };

const CHOICES = [
  { value: "PRESENT", label: "P", title: "Present" },
  { value: "LATE", label: "L", title: "Late" },
  { value: "ABSENT", label: "A", title: "Absent" },
  { value: "EXCUSED", label: "E", title: "Excused" },
] as const;

/**
 * The teacher's live screen: QR and code on top (sized for a projector or
 * the phone held up), the roster filling in below, one tap to override.
 */
export default async function SessionPage({ params }: PageProps<"/teacher/session/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    include: { room: true, records: true },
  });
  if (!session) notFound();
  const course = await courseForStaff(staff, session.courseId, campusClock().dateKey);
  if (!course && session.openedById !== staff.id) notFound();

  const c = course ?? (await prisma.course.findUniqueOrThrow({ where: { id: session.courseId }, include: { subject: true, section: true } }));
  const students = await prisma.student.findMany({ where: { sectionId: c.sectionId, status: "ACTIVE" }, orderBy: { rollNo: "asc" } });

  const now = new Date();
  const open = session.closesAt > now;
  const byStudent = new Map(session.records.map((r) => [r.studentId, r]));
  const present = session.records.filter((r) => (ATTENDED as readonly string[]).includes(r.status)).length;
  const flagged = session.records.filter((r) => r.flagged);
  const minsLeft = Math.max(0, Math.ceil((session.closesAt.getTime() - now.getTime()) / 60_000));
  // Unmarked first while open: those are the faces to look for.
  const ordered = open ? [...students].sort((a, b) => Number(byStudent.has(a.id)) - Number(byStudent.has(b.id))) : students;

  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-10 pt-4">
      <AutoRefresh seconds={open ? 5 : 60} />
      <Link href="/teacher" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Today
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{c.subject.name}</h1>
          <p className="text-sm text-muted-foreground">
            {c.section.name} · {formatDateKey(keyFromDate(session.date))}
            {session.room ? ` · ${session.room.name}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums">
            {present}
            <span className="text-lg font-medium text-muted-foreground">/{students.length}</span>
          </p>
          <p className="text-xs text-muted-foreground">present</p>
        </div>
      </div>

      <div className="mt-4">
        {open ? (
          <>
            <LiveCode sessionId={session.id} />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Closes in {minsLeft} min · after {session.lateAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: process.env.CAMPUS_TZ || "Asia/Kolkata" })} marks count as late
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
            <Lock className="size-4" /> Marking is closed. Unmarked students count as absent.
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <form action={extendSession.bind(null, session.id)}>
            <Button type="submit" variant="outline" className="h-11 w-full">
              <Plus className="size-4" /> {open ? "5 more min" : "Reopen 5 min"}
            </Button>
          </form>
          {open && (
            <form action={closeSession.bind(null, session.id)}>
              <Button type="submit" variant="secondary" className="h-11 w-full">
                <Lock className="size-4" /> Close now
              </Button>
            </form>
          )}
        </div>
      </div>

      {flagged.length > 0 && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-subtle px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {flagged.length} mark{flagged.length === 1 ? "" : "s"} to review: location didn&apos;t match the room. Tap A if the student isn&apos;t here.
        </p>
      )}

      <ul className="mt-5 divide-y rounded-2xl border bg-surface">
        {ordered.map((s) => {
          const r = byStudent.get(s.id);
          return (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="font-mono">{s.rollNo}</span>
                  {r?.flagged && r.flagReason && <span className="text-warning-foreground dark:text-warning">⚠ {r.flagReason}</span>}
                  {r?.method === "MANUAL" && <span>set by teacher</span>}
                </p>
              </div>
              {r ? <AttendancePill status={r.status} /> : <StatusPill tone="neutral">{open ? "Waiting" : "Absent"}</StatusPill>}
              <form action={setRecordStatus.bind(null, session.id, s.id)} className="flex gap-0.5">
                {CHOICES.map((ch) => (
                  <button
                    key={ch.value}
                    name="status"
                    value={ch.value}
                    title={ch.title}
                    aria-label={`${ch.title}: ${s.name}`}
                    aria-pressed={r?.status === ch.value}
                    className={`size-8 rounded-md text-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
                      r?.status === ch.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
