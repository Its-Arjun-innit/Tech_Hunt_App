import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { NativeSelect } from "@/components/ui/native-select";
import { saveCourse } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses" };

/** Who teaches which subject to which section. Saving an existing pair changes its teacher. */
export default async function CoursesPage() {
  await requireStaff("ADMIN");
  const [sections, subjects, teachers, courses] = await Promise.all([
    prisma.section.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ orderBy: { code: "asc" } }),
    prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({
      include: { subject: true, section: true, teacher: true, _count: { select: { slots: true, sessions: true } } },
      orderBy: [{ section: { name: "asc" } }, { subject: { code: "asc" } }],
    }),
  ]);

  const bySection = Map.groupBy(courses, (c) => c.section.name);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Courses" description="Assign a teacher to each subject a section takes." />
      <ActionForm action={saveCourse} className="flex flex-wrap gap-2 rounded-lg border p-3">
        <NativeSelect name="sectionId" required aria-label="Section" className="w-32">
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="subjectId" required aria-label="Subject" className="sm:w-64">
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="teacherId" required aria-label="Teacher" className="sm:w-48">
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <SubmitButton>Save</SubmitButton>
      </ActionForm>

      {[...bySection].map(([section, list]) => (
        <section key={section} className="rounded-lg border">
          <h2 className="border-b px-4 py-2 font-semibold">{section}</h2>
          <ul className="divide-y text-sm">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  <span className="font-mono">{c.subject.code}</span> {c.subject.name} · <span className="text-muted-foreground">{c.teacher.name}</span>
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {c._count.slots} per week · {c._count.sessions} held
                  <DeleteButton kind="course" id={c.id} label={`${c.subject.code} for ${section}`} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
