import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { createDepartment, createSection, createSubject } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Departments" };

export default async function StructurePage() {
  await requireStaff("ADMIN");
  const departments = await prisma.department.findMany({
    include: {
      sections: { include: { _count: { select: { students: true } } }, orderBy: { name: "asc" } },
      subjects: { orderBy: { code: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  const deptSelect = (
    <NativeSelect name="departmentId" required aria-label="Department" className="sm:w-40">
      {departments.map((d) => (
        <option key={d.id} value={d.id}>
          {d.code}
        </option>
      ))}
    </NativeSelect>
  );

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title="Departments, sections and subjects" description="The skeleton everything else hangs off." />

      <ActionForm action={createDepartment} className="flex flex-wrap items-end gap-2">
        <Input name="name" placeholder="Computer Science and Engineering" aria-label="Department name" className="sm:w-80" required />
        <Input name="code" placeholder="CSE" aria-label="Department code" className="w-28 uppercase" required />
        <SubmitButton>Add department</SubmitButton>
      </ActionForm>

      {departments.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-3">
            <h2 className="font-semibold">Sections</h2>
            <ActionForm action={createSection} className="flex flex-wrap gap-2">
              {deptSelect}
              <Input name="name" placeholder="CSE-A" aria-label="Section name" className="w-28 uppercase" required />
              <Input name="year" type="number" min={1} max={6} defaultValue={1} aria-label="Year" className="w-20" />
              <Input name="semester" type="number" min={1} max={12} defaultValue={1} aria-label="Semester" className="w-20" />
              <SubmitButton>Add</SubmitButton>
            </ActionForm>
          </section>
          <section className="space-y-3">
            <h2 className="font-semibold">Subjects</h2>
            <ActionForm action={createSubject} className="flex flex-wrap gap-2">
              {deptSelect}
              <Input name="code" placeholder="CS301" aria-label="Subject code" className="w-28 uppercase" required />
              <Input name="name" placeholder="Operating Systems" aria-label="Subject name" className="sm:w-52" required />
              <SubmitButton>Add</SubmitButton>
            </ActionForm>
          </section>
        </div>
      )}

      {departments.map((d) => (
        <section key={d.id} className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="font-semibold">
              {d.name} <span className="font-mono text-sm text-muted-foreground">{d.code}</span>
            </h2>
            <DeleteButton kind="department" id={d.id} label={d.name} />
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <ul className="space-y-1 text-sm">
              {d.sections.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>
                    {s.name} <span className="text-muted-foreground">· year {s.year}, sem {s.semester} · {s._count.students} students</span>
                  </span>
                  <DeleteButton kind="section" id={s.id} label={s.name} />
                </li>
              ))}
              {d.sections.length === 0 && <li className="text-muted-foreground">No sections.</li>}
            </ul>
            <ul className="space-y-1 text-sm">
              {d.subjects.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>
                    <span className="font-mono">{s.code}</span> {s.name}
                  </span>
                  <DeleteButton kind="subject" id={s.id} label={s.code} />
                </li>
              ))}
              {d.subjects.length === 0 && <li className="text-muted-foreground">No subjects.</li>}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
