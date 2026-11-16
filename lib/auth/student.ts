import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { STUDENT_COOKIE } from "./session";

/**
 * The signed-in student with their section. Every student page and action
 * resolves identity here, never from client input. Cached per request so the
 * layout and page share one query.
 */
export const getStudent = cache(async () => {
  const token = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.studentSession.findUnique({
    where: { token },
    include: { student: { include: { section: { include: { department: true } } } } },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (session.student.status !== "ACTIVE") return null;
  return session.student;
});

export type StudentContext = NonNullable<Awaited<ReturnType<typeof getStudent>>>;

export async function requireStudent(next?: string): Promise<StudentContext> {
  const student = await getStudent();
  if (!student) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return student;
}
