import "server-only";
import type { Notice } from "@prisma/client";
import { prisma } from "@/lib/db";
import { taughtSectionIds, type StaffContext } from "@/lib/auth/staff";

/** The audiences this staff member may post to, for the composer's select. */
export async function audienceOptions(staff: StaffContext) {
  const options: { value: string; label: string }[] = [];
  if (staff.role === "ADMIN") options.push({ value: "ALL", label: "Everyone" });

  const depts =
    staff.role === "ADMIN"
      ? await prisma.department.findMany({ orderBy: { name: "asc" } })
      : staff.role === "HOD" && staff.departmentId
        ? await prisma.department.findMany({ where: { id: staff.departmentId } })
        : [];
  for (const d of depts) options.push({ value: `DEPARTMENT:${d.id}`, label: `${d.name} (department)` });

  const sections =
    staff.role === "TEACHER"
      ? await prisma.section.findMany({ where: { id: { in: await taughtSectionIds(staff.id) } }, orderBy: { name: "asc" } })
      : await prisma.section.findMany({
          where: staff.role === "HOD" ? { departmentId: staff.departmentId ?? "" } : {},
          orderBy: { name: "asc" },
        });
  for (const s of sections) options.push({ value: `SECTION:${s.id}`, label: s.name });
  return options;
}

/**
 * How many students each notice reaches and how many opened it, so a teacher
 * can tell "posted" from "seen".
 */
export async function noticeReach(notices: Pick<Notice, "id" | "audience" | "targetId">[]) {
  const [bySection, sections, total, reads, depts] = await Promise.all([
    prisma.student.groupBy({ by: ["sectionId"], where: { status: "ACTIVE" }, _count: true }),
    prisma.section.findMany({ select: { id: true, name: true, departmentId: true } }),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.noticeRead.groupBy({ by: ["noticeId"], where: { noticeId: { in: notices.map((n) => n.id) } }, _count: true }),
    prisma.department.findMany({ select: { id: true, name: true } }),
  ]);
  const inSection = new Map(bySection.map((s) => [s.sectionId, s._count]));
  const seen = new Map(reads.map((r) => [r.noticeId, r._count]));

  return new Map(
    notices.map((n) => {
      let audience = total;
      let label = "Everyone";
      if (n.audience === "SECTION") {
        audience = inSection.get(n.targetId ?? "") ?? 0;
        label = sections.find((s) => s.id === n.targetId)?.name ?? "Section";
      } else if (n.audience === "DEPARTMENT") {
        audience = sections.filter((s) => s.departmentId === n.targetId).reduce((sum, s) => sum + (inSection.get(s.id) ?? 0), 0);
        label = depts.find((d) => d.id === n.targetId)?.name ?? "Department";
      }
      return [n.id, { audience, seen: seen.get(n.id) ?? 0, label }];
    }),
  );
}
