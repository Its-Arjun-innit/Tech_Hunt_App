import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { IssueForm } from "@/components/admin/issue-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusPill } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { createStaff, importStaff, resetStaffPassword, setStaffActive } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaff("ADMIN");
  const [staff, departments] = await Promise.all([
    prisma.staff.findMany({
      include: { department: true, _count: { select: { courses: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader title="Staff" description="Teachers sign in with email and a password. New and reset passwords are shown once." />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">Add one</h2>
          <IssueForm action={createStaff} submitLabel="Add staff" secretLabel="Password" className="flex flex-wrap gap-2">
            <Input name="name" placeholder="Full name" aria-label="Name" required className="sm:w-48" />
            <Input name="email" type="email" placeholder="name@college.edu" aria-label="Email" required className="sm:w-56" />
            <NativeSelect name="role" aria-label="Role" className="w-28">
              <option value="TEACHER">Teacher</option>
              <option value="HOD">HOD</option>
              <option value="ADMIN">Admin</option>
            </NativeSelect>
            <NativeSelect name="departmentId" aria-label="Department" className="w-28">
              <option value="">No dept.</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </NativeSelect>
          </IssueForm>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Import CSV</h2>
          <IssueForm action={importStaff} submitLabel="Import" secretLabel="Password" className="space-y-2">
            <Textarea
              name="csv"
              rows={4}
              required
              className="font-mono text-xs"
              placeholder={"email,name,role,department\nanita@college.edu,Anita Rao,TEACHER,CSE"}
              aria-label="Staff CSV"
            />
          </IssueForm>
        </section>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Courses</th>
              <th className="px-3 py-2">Last sign-in</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t align-top">
                <td className="px-3 py-2 font-medium">
                  {s.name} {!s.active && <StatusPill tone="neutral">Disabled</StatusPill>}
                </td>
                <td className="px-3 py-2">{s.email}</td>
                <td className="px-3 py-2">
                  {s.role.toLowerCase()}
                  {s.department ? ` · ${s.department.code}` : ""}
                </td>
                <td className="px-3 py-2 tabular-nums">{s._count.courses}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.lastLoginAt?.toLocaleDateString("en-GB") ?? "never"}</td>
                <td className="px-3 py-2">
                  {s.id !== me.id && (
                    <div className="flex flex-wrap justify-end gap-1">
                      <IssueForm action={resetStaffPassword} submitLabel="Reset password" secretLabel="Password">
                        <input type="hidden" name="id" value={s.id} />
                      </IssueForm>
                      <form action={setStaffActive.bind(null, s.id, !s.active)}>
                        <Button type="submit" size="sm" variant="ghost">
                          {s.active ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
