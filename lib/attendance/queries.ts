import "server-only";
import { prisma } from "@/lib/db";
import { ATTENDED, standing, type Standing } from "./stats";

export type CourseStanding = Standing & {
  courseId: string;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
};

/** Every course of the student's section with their standing in it. */
export async function studentStandings(
  student: { id: string; sectionId: string },
  minPct: number,
): Promise<CourseStanding[]> {
  const now = new Date();
  const [courses, held, attended] = await Promise.all([
    prisma.course.findMany({
      where: { sectionId: student.sectionId },
      include: { subject: true, teacher: { select: { name: true } } },
      orderBy: { subject: { code: "asc" } },
    }),
    prisma.attendanceSession.groupBy({
      by: ["courseId"],
      where: { course: { sectionId: student.sectionId }, openedAt: { lte: now } },
      _count: true,
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId: student.id, status: { in: [...ATTENDED] } },
      select: { session: { select: { courseId: true } } },
    }),
  ]);

  const heldBy = new Map(held.map((h) => [h.courseId, h._count]));
  const attendedBy = new Map<string, number>();
  for (const r of attended) attendedBy.set(r.session.courseId, (attendedBy.get(r.session.courseId) ?? 0) + 1);

  return courses.map((c) => ({
    ...standing(attendedBy.get(c.id) ?? 0, heldBy.get(c.id) ?? 0, minPct),
    courseId: c.id,
    subjectCode: c.subject.code,
    subjectName: c.subject.name,
    teacherName: c.teacher.name,
  }));
}

/** Sum across courses, for the home ring. */
export function overall(rows: Standing[], minPct: number): Standing {
  const a = rows.reduce((n, r) => n + r.attended, 0);
  const h = rows.reduce((n, r) => n + r.held, 0);
  return standing(a, h, minPct);
}

export type RosterStanding = Standing & { studentId: string; rollNo: string; name: string };

/** Every student of a course's section with their standing in that course. */
export async function courseRoster(courseId: string, minPct: number): Promise<RosterStanding[]> {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });
  const [students, held, attended] = await Promise.all([
    prisma.student.findMany({
      where: { sectionId: course.sectionId, status: "ACTIVE" },
      orderBy: { rollNo: "asc" },
    }),
    prisma.attendanceSession.count({ where: { courseId, openedAt: { lte: new Date() } } }),
    prisma.attendanceRecord.groupBy({
      by: ["studentId"],
      where: { session: { courseId }, status: { in: [...ATTENDED] } },
      _count: true,
    }),
  ]);
  const attendedBy = new Map(attended.map((a) => [a.studentId, a._count]));
  return students.map((s) => ({
    ...standing(attendedBy.get(s.id) ?? 0, held, minPct),
    studentId: s.id,
    rollNo: s.rollNo,
    name: s.name,
  }));
}
