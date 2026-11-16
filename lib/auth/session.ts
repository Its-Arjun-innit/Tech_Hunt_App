import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { generateSessionToken } from "@/lib/qr/token";

export const STUDENT_COOKIE = "ch_student";
export const STAFF_COOKIE = "ch_staff";

// A semester-long app: nobody wants to type a PIN every morning.
const STUDENT_TTL_DAYS = 30;
const STAFF_TTL_DAYS = 7;

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Client IP and user agent, for the audit trail. */
export async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

/**
 * Starts a student session. Every other session for the student is deleted
 * first: one phone per student. Signing in on a friend's phone to mark for
 * them signs the friend's own account out of that phone's cookie, and the
 * student out of their own phone, which makes proxying noisy.
 */
export async function createStudentSession(studentId: string) {
  const { ip, userAgent } = await requestMeta();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + STUDENT_TTL_DAYS * 86_400_000);

  await prisma.$transaction([
    prisma.studentSession.deleteMany({ where: { studentId } }),
    prisma.studentSession.create({ data: { token, studentId, expiresAt, ip, userAgent } }),
    prisma.student.update({ where: { id: studentId }, data: { lastLoginAt: new Date() } }),
  ]);

  (await cookies()).set(STUDENT_COOKIE, token, cookieOptions(expiresAt));
}

export async function createStaffSession(staffId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + STAFF_TTL_DAYS * 86_400_000);

  await prisma.staffSession.create({ data: { token, staffId, expiresAt } });
  await prisma.staff.update({ where: { id: staffId }, data: { lastLoginAt: new Date() } });

  (await cookies()).set(STAFF_COOKIE, token, cookieOptions(expiresAt));
}

export async function destroyStudentSession() {
  const store = await cookies();
  const token = store.get(STUDENT_COOKIE)?.value;
  if (token) await prisma.studentSession.deleteMany({ where: { token } });
  store.delete(STUDENT_COOKIE);
}

export async function destroyStaffSession() {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (token) await prisma.staffSession.deleteMany({ where: { token } });
  store.delete(STAFF_COOKIE);
}
