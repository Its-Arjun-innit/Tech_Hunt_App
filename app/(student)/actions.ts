"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/auth/student";
import { requestMeta } from "@/lib/auth/session";
import { markAttendance, type MarkOutcome } from "@/lib/attendance/mark";
import { prisma } from "@/lib/db";
import { noticesForStudent } from "@/lib/notices";

const markSchema = z.object({
  token: z.string().regex(/^at_[a-z0-9]+$/i).nullable(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  method: z.enum(["QR", "CODE"]),
  coords: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().nonnegative().nullable().optional(),
    })
    .nullable(),
});

/**
 * Records that the student opened a notice. Called from the browser once the
 * page is actually on screen (not during render, which a prefetch could
 * trigger), and refreshes the layout so the unread badge drops.
 */
export async function markNoticeRead(noticeId: string) {
  const student = await requireStudent();
  const visible = await prisma.notice.count({ where: { id: noticeId, ...noticesForStudent(student) } });
  if (!visible) return;
  await prisma.noticeRead.upsert({
    where: { noticeId_studentId: { noticeId, studentId: student.id } },
    update: {},
    create: { noticeId, studentId: student.id },
  });
  revalidatePath("/", "layout");
}

/** The student is always the one in the session cookie, never a value from the form. */
export async function submitMark(input: z.input<typeof markSchema>): Promise<MarkOutcome> {
  const student = await requireStudent();
  const parsed = markSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "CODE", message: parsed.error.issues[0]?.message ?? "That code is not valid." };
  }
  const { ip } = await requestMeta();
  const outcome = await markAttendance({
    ...parsed.data,
    studentId: student.id,
    sectionId: student.sectionId,
    ip,
  });
  if (outcome.ok) revalidatePath("/", "layout");
  return outcome;
}
