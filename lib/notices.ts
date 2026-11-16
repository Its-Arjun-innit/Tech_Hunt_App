import type { NoticeAudience, Prisma } from "@prisma/client";

export const AUDIENCE_LABEL: Record<NoticeAudience, string> = {
  ALL: "Everyone",
  DEPARTMENT: "Department",
  SECTION: "Section",
};

/**
 * Prisma filter for the notices a student can see.
 *
 * Scheduling is evaluated at read time, as the old announcements did: a
 * future-dated notice is simply invisible until its time, so there is no job.
 */
export function noticesForStudent(
  student: { sectionId: string; section: { departmentId: string } },
  now: Date = new Date(),
): Prisma.NoticeWhereInput {
  return {
    AND: [
      { OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }] },
      {
        OR: [
          { audience: "ALL" },
          { audience: "DEPARTMENT", targetId: student.section.departmentId },
          { audience: "SECTION", targetId: student.sectionId },
        ],
      },
    ],
  };
}

/**
 * Who may post to which audience. Admins reach everyone, an HOD their own
 * department, a teacher only the sections they teach.
 */
export function canPost(
  staff: { role: "TEACHER" | "HOD" | "ADMIN"; departmentId: string | null },
  audience: NoticeAudience,
  targetId: string | null,
  taughtSectionIds: string[],
): boolean {
  if (staff.role === "ADMIN") return true;
  if (audience === "ALL") return false;
  if (audience === "DEPARTMENT") return staff.role === "HOD" && targetId === staff.departmentId;
  return targetId !== null && (taughtSectionIds.includes(targetId) || staff.role === "HOD");
}
