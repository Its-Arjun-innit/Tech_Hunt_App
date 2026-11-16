"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import type { NoticeAudience } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auditLog, courseForStaff, requireStaff, taughtSectionIds, type StaffContext } from "@/lib/auth/staff";
import { getSettings } from "@/lib/settings";
import { campusClock, campusLocalToDate, dateFromKey, formatDateKey, formatMin, parseTime } from "@/lib/time";
import { classesBetween } from "@/lib/timetable/load";
import { currentCode, newSecret } from "@/lib/attendance/code";
import { attendanceUrl, generateAttendanceToken } from "@/lib/qr/token";
import { canPost } from "@/lib/notices";
import type { ActionResult } from "@/components/action-form";

// ─────────────────────────── Attendance sessions ───────────────────────────

/**
 * Opens attendance for a class, or returns to the one already open. A slot
 * id ties it to the timetable (and its room for the location check); without
 * one it is an extra class with no room check.
 */
export async function startSession(courseId: string, slotId: string | null) {
  const staff = await requireStaff();
  const today = campusClock().dateKey;
  const course = await courseForStaff(staff, courseId, today);
  if (!course) throw new Error("You don't teach this class.");

  const now = new Date();
  const open = await prisma.attendanceSession.findFirst({ where: { courseId, closesAt: { gt: now } } });
  if (open) redirect(`/teacher/session/${open.id}`);

  let roomId: string | null = null;
  if (slotId) {
    const [day] = await classesBetween({ sectionId: course.sectionId }, today);
    roomId = day.classes.find((c) => c.slotId === slotId)?.roomId ?? null;
  }

  const settings = await getSettings();
  const session = await prisma.attendanceSession.create({
    data: {
      courseId,
      slotId,
      roomId,
      openedById: staff.id,
      date: dateFromKey(today),
      token: generateAttendanceToken(),
      secret: newSecret(),
      lateAt: new Date(now.getTime() + settings.lateAfterMin * 60_000),
      closesAt: new Date(now.getTime() + settings.sessionMinutes * 60_000),
    },
  });
  await auditLog({ actorId: staff.id, actorName: staff.name, action: "SESSION_OPENED", entity: "AttendanceSession", entityId: session.id });
  redirect(`/teacher/session/${session.id}`);
}

async function ownedSession(staff: StaffContext, sessionId: string) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  const course = await courseForStaff(staff, session.courseId, campusClock().dateKey);
  return course || session.openedById === staff.id ? session : null;
}

/**
 * The code and QR for right now. The secret never leaves the server: the
 * teacher's screen asks for a fresh code each window.
 */
export async function sessionCode(sessionId: string) {
  const staff = await requireStaff();
  const session = await ownedSession(staff, sessionId);
  if (!session) return { closed: true as const };
  if (session.closesAt <= new Date()) return { closed: true as const };

  const { code, msLeft } = currentCode(session.secret);
  const svg = await QRCode.toString(attendanceUrl(session.token, code), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return { closed: false as const, code, msLeft, svg, closesAt: session.closesAt.toISOString() };
}

const STATUS = z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]);

/** Teacher override for one student, e.g. a phone with no battery. */
export async function setRecordStatus(sessionId: string, studentId: string, formData: FormData) {
  const staff = await requireStaff();
  const session = await ownedSession(staff, sessionId);
  const status = STATUS.parse(formData.get("status"));
  if (!session) throw new Error("Not your class.");

  const student = await prisma.student.findFirst({
    where: { id: studentId, section: { courses: { some: { id: session.courseId } } } },
  });
  if (!student) throw new Error("Student is not in this class.");

  await prisma.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    update: { status, method: "MANUAL", markedById: staff.id, flagged: false },
    create: { sessionId, studentId, status, method: "MANUAL", markedById: staff.id },
  });
  await auditLog({
    actorId: staff.id,
    actorName: staff.name,
    action: "ATTENDANCE_OVERRIDE",
    entity: "AttendanceRecord",
    entityId: `${sessionId}:${studentId}`,
    meta: { status },
  });
  revalidatePath(`/teacher/session/${sessionId}`);
}

/** Keep marking open a few more minutes, or reopen a closed session. */
export async function extendSession(sessionId: string) {
  const staff = await requireStaff();
  const session = await ownedSession(staff, sessionId);
  if (!session) throw new Error("Not your class.");
  const base = Math.max(session.closesAt.getTime(), Date.now());
  await prisma.attendanceSession.update({ where: { id: sessionId }, data: { closesAt: new Date(base + 5 * 60_000) } });
  revalidatePath(`/teacher/session/${sessionId}`);
}

export async function closeSession(sessionId: string) {
  const staff = await requireStaff();
  const session = await ownedSession(staff, sessionId);
  if (!session) throw new Error("Not your class.");
  await prisma.attendanceSession.update({ where: { id: sessionId }, data: { closesAt: new Date() } });
  await auditLog({ actorId: staff.id, actorName: staff.name, action: "SESSION_CLOSED", entity: "AttendanceSession", entityId: sessionId });
  revalidatePath(`/teacher/session/${sessionId}`);
}

// ─────────────────────────── One-day class changes ───────────────────────────

const changeSchema = z.object({
  slotId: z.string().min(1, "Pick a class"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  kind: z.enum(["CANCEL", "CHANGE", "RESTORE"]),
  start: z.string().optional(),
  end: z.string().optional(),
  roomId: z.string().optional(),
  substituteId: z.string().optional(),
  note: z.string().trim().max(200).optional(),
});

/**
 * Cancels, moves, re-rooms or hands over one class on one date, and tells the
 * section with a notice, so nobody walks to an empty room.
 */
export async function changeClass(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff();
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const slot = await prisma.timetableSlot.findUnique({ where: { id: d.slotId } });
  if (!slot) return { error: "Class not found." };
  const course = await courseForStaff(staff, slot.courseId);
  if (!course) return { error: "You don't teach this class." };
  if (dateFromKey(d.date).getUTCDay() !== slot.dayOfWeek) {
    return { error: `That class runs on a different weekday than ${formatDateKey(d.date)}.` };
  }

  const where = { slotId_date: { slotId: d.slotId, date: dateFromKey(d.date) } };
  if (d.kind === "RESTORE") {
    await prisma.slotException.deleteMany({ where: { slotId: d.slotId, date: dateFromKey(d.date) } });
    revalidatePath("/", "layout");
    return { ok: "Back to the usual timetable for that day." };
  }

  const startMin = d.start ? parseTime(d.start) : null;
  const endMin = d.end ? parseTime(d.end) : null;
  if (d.kind === "CHANGE" && (startMin ?? slot.startMin) >= (endMin ?? slot.endMin)) {
    return { error: "The class must end after it starts." };
  }

  const data = {
    cancelled: d.kind === "CANCEL",
    startMin: d.kind === "CHANGE" ? startMin : null,
    endMin: d.kind === "CHANGE" ? endMin : null,
    roomId: d.kind === "CHANGE" ? d.roomId || null : null,
    substituteId: d.kind === "CHANGE" ? d.substituteId || null : null,
    note: d.note || null,
  };
  await prisma.slotException.upsert({ where, update: data, create: { slotId: d.slotId, date: dateFromKey(d.date), ...data } });

  const when = `${formatDateKey(d.date)}, ${formatMin(slot.startMin)}`;
  const title =
    d.kind === "CANCEL" ? `${course.subject.name} cancelled — ${when}` : `${course.subject.name} changed — ${when}`;
  const details = [
    data.startMin != null && `New time: ${formatMin(data.startMin)}${data.endMin != null ? `–${formatMin(data.endMin)}` : ""}`,
    data.roomId && `Room: ${(await prisma.room.findUnique({ where: { id: data.roomId } }))?.name}`,
    data.substituteId && `Taken by: ${(await prisma.staff.findUnique({ where: { id: data.substituteId } }))?.name}`,
    data.note,
  ].filter(Boolean);

  await prisma.notice.create({
    data: {
      authorId: staff.id,
      title,
      body: details.join("\n") || "Check your timetable for the update.",
      audience: "SECTION",
      targetId: course.sectionId,
      urgent: d.kind === "CANCEL",
    },
  });
  await auditLog({ actorId: staff.id, actorName: staff.name, action: `CLASS_${d.kind}`, entity: "TimetableSlot", entityId: d.slotId, meta: { date: d.date } });
  revalidatePath("/", "layout");
  return { ok: d.kind === "CANCEL" ? "Class cancelled and the section notified." : "Class updated and the section notified." };
}

// ─────────────────────────────── Notices ───────────────────────────────

const noticeSchema = z.object({
  audience: z.string().regex(/^(ALL|DEPARTMENT|SECTION)(:.+)?$/, "Pick who should see it"),
  title: z.string().trim().min(3, "Add a title").max(120),
  body: z.string().trim().min(1, "Write the notice").max(5000),
  attachmentUrl: z.union([z.literal(""), z.string().url("Attachment must be a link (https://…)")]).optional(),
  scheduledFor: z.string().optional(),
  pinned: z.literal("on").optional(),
  urgent: z.literal("on").optional(),
});

export async function postNotice(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff();
  const parsed = noticeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const [audience, targetId = null] = d.audience.split(":") as [NoticeAudience, string?];
  if (!canPost(staff, audience, targetId, await taughtSectionIds(staff.id))) {
    return { error: "You can't post to that audience." };
  }
  const scheduledFor = d.scheduledFor ? campusLocalToDate(d.scheduledFor) : null;
  if (d.scheduledFor && !scheduledFor) return { error: "Schedule time is not valid." };

  const notice = await prisma.notice.create({
    data: {
      authorId: staff.id,
      audience,
      targetId: audience === "ALL" ? null : targetId,
      title: d.title,
      body: d.body,
      attachmentUrl: d.attachmentUrl || null,
      scheduledFor: scheduledFor && scheduledFor > new Date() ? scheduledFor : null,
      pinned: !!d.pinned,
      urgent: !!d.urgent,
    },
  });
  await auditLog({ actorId: staff.id, actorName: staff.name, action: "NOTICE_POSTED", entity: "Notice", entityId: notice.id });
  revalidatePath("/", "layout");
  return { ok: scheduledFor && scheduledFor > new Date() ? "Notice scheduled." : "Notice posted." };
}

export async function deleteNotice(noticeId: string) {
  const staff = await requireStaff();
  const notice = await prisma.notice.findUnique({ where: { id: noticeId } });
  if (!notice || (notice.authorId !== staff.id && staff.role !== "ADMIN")) throw new Error("Not your notice.");
  await prisma.notice.delete({ where: { id: noticeId } });
  await auditLog({ actorId: staff.id, actorName: staff.name, action: "NOTICE_DELETED", entity: "Notice", entityId: noticeId });
  revalidatePath("/", "layout");
}
