import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classes" };

/** Courses this teacher runs. An HOD also sees every course in their department. */
export default async function ClassesPage() {
  const staff = await requireStaff();
  const courses = await prisma.course.findMany({
    where:
      staff.role === "HOD" && staff.departmentId
        ? { OR: [{ teacherId: staff.id }, { subject: { departmentId: staff.departmentId } }] }
        : staff.role === "ADMIN"
          ? {}
          : { teacherId: staff.id },
    include: {
      subject: true,
      section: { include: { _count: { select: { students: true } } } },
      teacher: { select: { id: true, name: true } },
      _count: { select: { sessions: true } },
    },
    orderBy: [{ section: { name: "asc" } }, { subject: { code: "asc" } }],
  });

  return (
    <>
      <AppHeader title="Classes" subtitle="Reports, class changes and exports" name={staff.name} profileHref="/teacher/profile" />
      <main className="mx-auto w-full max-w-lg px-5 py-5">
        {courses.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
            No classes assigned yet. The college office assigns them.
          </p>
        ) : (
          <ul className="space-y-2">
            {courses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/teacher/classes/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border bg-surface p-4 outline-none hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.subject.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.section.name} · {c.section._count.students} students · {c._count.sessions} classes held
                      {c.teacher.id !== staff.id ? ` · ${c.teacher.name}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
