import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { IssueForm } from "@/components/admin/issue-form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-badge";
import { importStudents, resetPins, setStudentActive } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  await requireStaff("ADMIN");
  const { section } = await searchParams;
  const sections = await prisma.section.findMany({ include: { _count: { select: { students: true } } }, orderBy: { name: "asc" } });
  const current = sections.find((s) => s.id === section) ?? sections[0];
  const students = current
    ? await prisma.student.findMany({ where: { sectionId: current.id }, orderBy: { rollNo: "asc" } })
    : [];

  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader title="Students" description="Students sign in with roll number and a 6-digit PIN. PINs are shown once, then only a hash is kept." />

      <section className="space-y-2">
        <h2 className="font-semibold">Import CSV</h2>
        <p className="text-sm text-muted-foreground">
          Columns: roll no, name, section. Section must match a name on the Departments page. Existing roll numbers are skipped.
        </p>
        <IssueForm action={importStudents} submitLabel="Import and issue PINs" className="space-y-2">
          <Textarea
            name="csv"
            rows={5}
            required
            className="font-mono text-xs"
            placeholder={"roll no,name,section\n23CSA001,Asha Kumar,CSE-A"}
            aria-label="Students CSV"
          />
        </IssueForm>
      </section>

      {sections.length > 0 && (
        <nav aria-label="Sections" className="flex flex-wrap gap-1">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/admin/students?section=${s.id}`}
              aria-current={s.id === current?.id ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${s.id === current?.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              {s.name} <span className="opacity-70">{s._count.students}</span>
            </Link>
          ))}
        </nav>
      )}

      {current && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{current.name}</h2>
            <IssueForm action={resetPins} submitLabel={`New PINs for all of ${current.name}`}>
              <input type="hidden" name="sectionId" value={current.id} />
            </IssueForm>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Roll no</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Last sign-in</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t align-top">
                    <td className="px-3 py-2 font-mono">{s.rollNo}</td>
                    <td className="px-3 py-2">
                      {s.name} {s.status !== "ACTIVE" && <StatusPill tone="neutral">Disabled</StatusPill>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{s.lastLoginAt?.toLocaleDateString("en-GB") ?? "never"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        <IssueForm action={resetPins} submitLabel="Reset PIN">
                          <input type="hidden" name="studentId" value={s.id} />
                        </IssueForm>
                        <form action={setStudentActive.bind(null, s.id, s.status !== "ACTIVE")}>
                          <Button type="submit" size="sm" variant="ghost">
                            {s.status === "ACTIVE" ? "Disable" : "Enable"}
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No students in this section yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
