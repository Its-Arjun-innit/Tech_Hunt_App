import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { STAFF_COOKIE } from "./session";

/** Higher number means more authority. */
const RANK: Record<StaffRole, number> = { TEACHER: 1, HOD: 2, ADMIN: 3 };

export const getStaff = cache(async () => {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.staffSession.findUnique({
    where: { token },
    include: { staff: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (!session.staff.active) return null;
  return session.staff;
});

export type StaffContext = NonNullable<Awaited<ReturnType<typeof getStaff>>>;

/**
 * Gate for every teacher and admin page and server action. A teacher who
 * lands on an admin page goes to their own app.
 */
export async function requireStaff(minRole: StaffRole = "TEACHER"): Promise<StaffContext> {
  const staff = await getStaff();
  if (!staff) redirect("/staff/login");
  if (RANK[staff.role] < RANK[minRole]) redirect("/teacher");
  return staff;
}

export function hasRole(staff: { role: StaffRole }, minRole: StaffRole) {
  return RANK[staff.role] >= RANK[minRole];
}

/**
 * The course if this staff member may run it: its teacher, an admin, the HOD
 * of its department, or whoever is substituting one of its classes today.
 */
export async function courseForStaff(staff: StaffContext, courseId: string, todayKey?: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { subject: true, section: true },
  });
  if (!course) return null;
  if (course.teacherId === staff.id || staff.role === "ADMIN") return course;
  if (staff.role === "HOD" && course.subject.departmentId === staff.departmentId) return course;
  if (todayKey) {
    const subbing = await prisma.slotException.count({
      where: { substituteId: staff.id, date: new Date(`${todayKey}T00:00:00Z`), slot: { courseId } },
    });
    if (subbing) return course;
  }
  return null;
}

/** Sections the staff member teaches, which bound where a teacher may post. */
export async function taughtSectionIds(staffId: string) {
  const courses = await prisma.course.findMany({ where: { teacherId: staffId }, select: { sectionId: true } });
  return [...new Set(courses.map((c) => c.sectionId))];
}

/** Writes an audit row. Never throws: an audit failure must not undo the action. */
export async function auditLog(entry: {
  actorType?: "STAFF" | "STUDENT" | "SYSTEM";
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
}) {
  await prisma.auditLog
    .create({
      data: {
        actorType: entry.actorType ?? "STAFF",
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        meta: (entry.meta ?? undefined) as never,
        ip: entry.ip ?? null,
      },
    })
    .catch(() => {});
}
