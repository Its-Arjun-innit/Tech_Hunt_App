import Link from "next/link";
import { Download } from "lucide-react";
import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { courseRoster } from "@/lib/attendance/queries";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/status-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance" };

/**
 * Per-section view: each course's average and its defaulters.
 * ponytail: one roster query per course. Fine for a college's few hundred
 * courses viewed by one office; cache or pre-aggregate if it gets slow.
 */
export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireStaff("ADMIN");
  const { section } = await searchParams;
  const { minAttendancePct } = await getSettings();
  const sections = await prisma.section.findMany({ orderBy: { name: "asc" } });
  const current = sections.find((s) => s.id === section) ?? sections[0];

  const courses = current
    ? await prisma.course.findMany({
        where: { sectionId: current.id },
        include: { subject: true, teacher: true },
        orderBy: { subject: { code: "asc" } },
      })
    : [];
  const rosters = await Promise.all(courses.map((c) => courseRoster(c.id, minAttendancePct)));

  // A student who is short in any subject, with every subject they're short in.
  const short = new Map<string, { rollNo: string; name: string; subjects: string[] }>();
  rosters.forEach((roster, i) =>
    roster
      .filter((r) => r.below)
      .forEach((r) => {
        const entry = short.get(r.studentId) ?? { rollNo: r.rollNo, name: r.name, subjects: [] };
        entry.subjects.push(`${courses[i].subject.code} ${r.pct}%`);
        short.set(r.studentId, entry);
      }),
  );

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Attendance" description={`Minimum ${minAttendancePct}%. Change it in Settings.`} />

      <nav aria-label="Sections" className="flex flex-wrap gap-1">
        {sections.map((s) => (
          <Link
            key={s.id}
            href={`/admin/reports?section=${s.id}`}
            aria-current={s.id === current?.id ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${s.id === current?.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            {s.name}
          </Link>
        ))}
      </nav>

      {current && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Teacher</th>
                  <th className="px-3 py-2 text-right">Held</th>
                  <th className="px-3 py-2 text-right">Average</th>
                  <th className="px-3 py-2 text-right">Below {minAttendancePct}%</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {courses.map((c, i) => {
                  const roster = rosters[i];
                  const held = roster[0]?.held ?? 0;
                  const avg = held && roster.length ? Math.round(roster.reduce((n, r) => n + (r.pct ?? 0), 0) / roster.length) : null;
                  const below = roster.filter((r) => r.below).length;
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2">
                        <Link href={`/teacher/classes/${c.id}`} className="underline-offset-4 hover:underline">
                          <span className="font-mono">{c.subject.code}</span> {c.subject.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{c.teacher.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{held}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{avg === null ? "—" : `${avg}%`}</td>
                      <td className="px-3 py-2 text-right">{below ? <StatusPill tone="danger">{below}</StatusPill> : "0"}</td>
                      <td className="px-3 py-2 text-right">
                        <a href={`/teacher/classes/${c.id}/export`} aria-label={`Download ${c.subject.code} register`} className="inline-flex text-muted-foreground hover:text-foreground">
                          <Download className="size-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section>
            <h2 className="mb-2 font-semibold">
              Short of attendance <span className="font-normal text-muted-foreground">· {short.size}</span>
            </h2>
            {short.size === 0 ? (
              <p className="text-sm text-muted-foreground">Nobody in {current.name} is below the minimum.</p>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {[...short.values()]
                  .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
                  .map((s) => (
                    <li key={s.rollNo} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                      <span>
                        <span className="font-mono text-xs text-muted-foreground">{s.rollNo}</span> {s.name}
                      </span>
                      <span className="text-danger">{s.subjects.join(" · ")}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
