"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auditLog, requireStaff } from "@/lib/auth/staff";
import { dateFromKey, parseTime, DAY_NAMES, formatMin } from "@/lib/time";
import { findClash } from "@/lib/timetable/resolve";
import { generatePassword, generatePin } from "@/lib/qr/token";
import { parseTable } from "@/lib/validation/csv";
import type { ActionResult } from "@/components/action-form";

/** An import or reset result that carries one-time secrets back to the page. */
export type IssueResult = ActionResult & { issued?: { who: string; login: string; secret: string }[] };

async function admin() {
  return requireStaff("ADMIN");
}

function fields(formData: FormData) {
  return Object.fromEntries(Array.from(formData.entries()).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
}

/** Turns constraint errors into sentences an office clerk can act on. */
function friendly(e: unknown, what: string): ActionResult {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { error: `That ${what} already exists.` };
    if (e.code === "P2003" || e.code === "P2014") return { error: `This ${what} is still in use. Remove what depends on it first.` };
  }
  throw e;
}

function done(path: string, message: string): ActionResult {
  revalidatePath(path);
  return { ok: message };
}

async function log(action: string, entity: string, entityId: string, meta?: Record<string, unknown>) {
  const staff = await admin();
  await auditLog({ actorId: staff.id, actorName: staff.name, action, entity, entityId, meta });
}

// ───────────────────────────── Structure ─────────────────────────────

export async function createDepartment(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await admin();
  const d = z.object({ name: z.string().min(2, "Name the department"), code: z.string().min(2, "Add a short code") }).safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  try {
    const dept = await prisma.department.create({ data: { name: d.data.name, code: d.data.code.toUpperCase() } });
    await log("DEPARTMENT_CREATED", "Department", dept.id);
    return done("/admin/structure", `${dept.name} added.`);
  } catch (e) {
    return friendly(e, "department code");
  }
}

export async function createSection(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await admin();
  const d = z
    .object({
      departmentId: z.string().min(1, "Pick a department"),
      name: z.string().min(1, "Name the section, e.g. CSE-A"),
      year: z.coerce.number().int().min(1).max(6),
      semester: z.coerce.number().int().min(1).max(12),
    })
    .safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  try {
    const s = await prisma.section.create({ data: { ...d.data, name: d.data.name.toUpperCase() } });
    await log("SECTION_CREATED", "Section", s.id);
    return done("/admin/structure", `${s.name} added.`);
  } catch (e) {
    return friendly(e, "section");
  }
}

export async function createSubject(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await admin();
  const d = z
    .object({ departmentId: z.string().min(1, "Pick a department"), code: z.string().min(2, "Add the subject code"), name: z.string().min(2, "Name the subject") })
    .safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  try {
    const s = await prisma.subject.create({ data: { ...d.data, code: d.data.code.toUpperCase() } });
    await log("SUBJECT_CREATED", "Subject", s.id);
    return done("/admin/structure", `${s.code} added.`);
  } catch (e) {
    return friendly(e, "subject code");
  }
}

/** One delete for the simple reference tables; the database refuses if something still points at the row. */
export async function deleteRow(kind: "department" | "section" | "subject" | "room" | "holiday" | "course" | "slot", id: string) {
  await admin();
  const ops = {
    department: () => prisma.department.delete({ where: { id } }),
    section: () => prisma.section.delete({ where: { id } }),
    subject: () => prisma.subject.delete({ where: { id } }),
    room: () => prisma.room.delete({ where: { id } }),
    holiday: () => prisma.holiday.delete({ where: { id } }),
    course: () => prisma.course.delete({ where: { id } }),
    slot: () => prisma.timetableSlot.delete({ where: { id } }),
  };
  try {
    await ops[kind]();
  } catch (e) {
    const r = friendly(e, kind);
    throw new Error(r.error);
  }
  await log(`${kind.toUpperCase()}_DELETED`, kind, id);
  revalidatePath("/admin", "layout");
}

// ─────────────────────────────── Rooms ───────────────────────────────

const roomSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name the room"),
  building: z.string().optional(),
  latitude: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]).optional(),
  longitude: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]).optional(),
  radiusM: z.coerce.number().int().min(10, "Radius under 10 m is tighter than phone GPS").max(1000),
});

export async function saveRoom(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await admin();
  const d = roomSchema.safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  const lat = d.data.latitude === "" || d.data.latitude === undefined ? null : d.data.latitude;
  const lng = d.data.longitude === "" || d.data.longitude === undefined ? null : d.data.longitude;
  if ((lat === null) !== (lng === null)) return { error: "Set both latitude and longitude, or neither." };
  const data = { name: d.data.name, building: d.data.building || null, latitude: lat, longitude: lng, radiusM: d.data.radiusM };
  try {
    const room = d.data.id ? await prisma.room.update({ where: { id: d.data.id }, data }) : await prisma.room.create({ data });
    await log(d.data.id ? "ROOM_UPDATED" : "ROOM_CREATED", "Room", room.id);
    return done("/admin/rooms", `${room.name} saved.`);
  } catch (e) {
    return friendly(e, "room name");
  }
}

// ─────────────────────────────── Staff ───────────────────────────────

const ROLE = z.enum(["TEACHER", "HOD", "ADMIN"]);

export async function createStaff(_p: IssueResult, fd: FormData): Promise<IssueResult> {
  await admin();
  const d = z
    .object({ name: z.string().min(2, "Add a name"), email: z.string().email("Enter a valid email"), role: ROLE, departmentId: z.string().optional() })
    .safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  const password = generatePassword();
  try {
    const s = await prisma.staff.create({
      data: {
        name: d.data.name,
        email: d.data.email.toLowerCase(),
        role: d.data.role,
        departmentId: d.data.departmentId || null,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    await log("STAFF_CREATED", "Staff", s.id);
    revalidatePath("/admin/staff");
    return { ok: `${s.name} added.`, issued: [{ who: s.name, login: s.email, secret: password }] };
  } catch (e) {
    return friendly(e, "email");
  }
}

export async function importStaff(_p: IssueResult, fd: FormData): Promise<IssueResult> {
  await admin();
  const csv = String(fd.get("csv") ?? "");
  const { rows, errors } = parseTable(csv, ["email", "name", "role", "department"] as const);
  if (!rows.length) return { error: errors[0] ?? "Nothing to import." };

  const depts = new Map((await prisma.department.findMany()).map((d) => [d.code.toUpperCase(), d.id]));
  const issued: NonNullable<IssueResult["issued"]> = [];
  for (const r of rows) {
    const role = ROLE.safeParse(r.role.toUpperCase());
    const departmentId = depts.get(r.department.toUpperCase());
    if (!role.success) {
      errors.push(`${r.email}: role must be TEACHER, HOD or ADMIN.`);
      continue;
    }
    if (!departmentId) {
      errors.push(`${r.email}: no department with code ${r.department}.`);
      continue;
    }
    const password = generatePassword();
    try {
      await prisma.staff.create({
        data: { email: r.email.toLowerCase(), name: r.name, role: role.data, departmentId, passwordHash: await bcrypt.hash(password, 10) },
      });
      issued.push({ who: r.name, login: r.email.toLowerCase(), secret: password });
    } catch {
      errors.push(`${r.email}: already exists.`);
    }
  }
  await log("STAFF_IMPORTED", "Staff", "-", { count: issued.length });
  revalidatePath("/admin/staff");
  return { ok: `${issued.length} staff added.`, error: errors.length ? errors.join(" ") : undefined, issued };
}

export async function resetStaffPassword(_p: IssueResult, fd: FormData): Promise<IssueResult> {
  await admin();
  const id = String(fd.get("id"));
  const password = generatePassword();
  const s = await prisma.staff.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await prisma.staffSession.deleteMany({ where: { staffId: id } });
  await log("STAFF_PASSWORD_RESET", "Staff", id);
  return { ok: `New password for ${s.name}.`, issued: [{ who: s.name, login: s.email, secret: password }] };
}

export async function setStaffActive(id: string, active: boolean) {
  const me = await admin();
  if (id === me.id) throw new Error("You can't disable your own account.");
  await prisma.staff.update({ where: { id }, data: { active } });
  if (!active) await prisma.staffSession.deleteMany({ where: { staffId: id } });
  await log(active ? "STAFF_ENABLED" : "STAFF_DISABLED", "Staff", id);
  revalidatePath("/admin/staff");
}

// ────────────────────────────── Students ──────────────────────────────

export async function importStudents(_p: IssueResult, fd: FormData): Promise<IssueResult> {
  await admin();
  const csv = String(fd.get("csv") ?? "");
  const { rows, errors } = parseTable(csv, ["rollNo", "name", "section"] as const);
  if (!rows.length) return { error: errors[0] ?? "Nothing to import." };

  const sections = new Map((await prisma.section.findMany()).map((s) => [s.name.toUpperCase(), s.id]));
  const issued: NonNullable<IssueResult["issued"]> = [];
  for (const r of rows) {
    const sectionId = sections.get(r.section.toUpperCase());
    if (!sectionId) {
      errors.push(`${r.rollNo}: no section named ${r.section}.`);
      continue;
    }
    const pin = generatePin();
    const rollNo = r.rollNo.toUpperCase();
    try {
      await prisma.student.create({ data: { rollNo, name: r.name, sectionId, pinHash: await bcrypt.hash(pin, 10) } });
      issued.push({ who: r.name, login: rollNo, secret: pin });
    } catch {
      errors.push(`${rollNo}: already exists.`);
    }
  }
  await log("STUDENTS_IMPORTED", "Student", "-", { count: issued.length });
  revalidatePath("/admin/students");
  return { ok: `${issued.length} students added.`, error: errors.length ? errors.join(" ") : undefined, issued };
}

/** New PINs for one student or a whole section. Signs them out everywhere. */
export async function resetPins(_p: IssueResult, fd: FormData): Promise<IssueResult> {
  await admin();
  const studentId = String(fd.get("studentId") ?? "");
  const sectionId = String(fd.get("sectionId") ?? "");
  const students = await prisma.student.findMany({
    where: studentId ? { id: studentId } : sectionId ? { sectionId } : { id: "-" },
    orderBy: { rollNo: "asc" },
  });
  if (!students.length) return { error: "Pick a student or a section." };

  const issued: NonNullable<IssueResult["issued"]> = [];
  for (const s of students) {
    const pin = generatePin();
    await prisma.student.update({ where: { id: s.id }, data: { pinHash: await bcrypt.hash(pin, 10) } });
    issued.push({ who: s.name, login: s.rollNo, secret: pin });
  }
  await prisma.studentSession.deleteMany({ where: { studentId: { in: students.map((s) => s.id) } } });
  await log("PINS_RESET", "Student", studentId || sectionId, { count: issued.length });
  return { ok: `${issued.length} new PIN${issued.length === 1 ? "" : "s"} issued.`, issued };
}

export async function setStudentActive(id: string, active: boolean) {
  await admin();
  await prisma.student.update({ where: { id }, data: { status: active ? "ACTIVE" : "DISABLED" } });
  if (!active) await prisma.studentSession.deleteMany({ where: { studentId: id } });
  await log(active ? "STUDENT_ENABLED" : "STUDENT_DISABLED", "Student", id);
  revalidatePath("/admin/students");
}

// ─────────────────────────── Courses & timetable ───────────────────────────

export async function saveCourse(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await admin();
  const d = z
    .object({ subjectId: z.string().min(1, "Pick a subject"), sectionId: z.string().min(1, "Pick a section"), teacherId: z.string().min(1, "Pick a teacher") })
    .safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  const c = await prisma.course.upsert({
    where: { subjectId_sectionId: { subjectId: d.data.subjectId, sectionId: d.data.sectionId } },
    update: { teacherId: d.data.teacherId },
    create: d.data,
  });
  await log("COURSE_SAVED", "Course", c.id);
  return done("/admin/courses", "Saved. If this section already had the subject, its teacher was updated.");
}

export async function addSlot(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await admin();
  const d = z
    .object({
      courseId: z.string().min(1, "Pick a class"),
      roomId: z.string().optional(),
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      start: z.string(),
      end: z.string(),
    })
    .safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  const startMin = parseTime(d.data.start);
  const endMin = parseTime(d.data.end);
  if (startMin === null || endMin === null || endMin <= startMin) return { error: "Set a start time before the end time." };

  const course = await prisma.course.findUniqueOrThrow({ where: { id: d.data.courseId } });
  const sameDay = await prisma.timetableSlot.findMany({
    where: { dayOfWeek: d.data.dayOfWeek },
    include: { course: { include: { subject: true, section: true } }, room: true },
  });
  const roomId = d.data.roomId || null;
  const clash = findClash(
    { dayOfWeek: d.data.dayOfWeek, startMin, endMin, roomId, teacherId: course.teacherId, sectionId: course.sectionId },
    sameDay.map((s) => ({ ...s, teacherId: s.course.teacherId, sectionId: s.course.sectionId })),
  );
  if (clash) {
    const s = sameDay.find((x) => x.id === clash.slot.id)!;
    const who = { section: s.course.section.name, teacher: "the same teacher", room: s.room?.name ?? "that room" }[clash.reason];
    return {
      error: `Clashes with ${s.course.subject.code} (${s.course.section.name}) at ${formatMin(s.startMin)}–${formatMin(s.endMin)} on ${DAY_NAMES[s.dayOfWeek]}: ${who} is already booked.`,
    };
  }

  const slot = await prisma.timetableSlot.create({ data: { courseId: course.id, roomId, dayOfWeek: d.data.dayOfWeek, startMin, endMin } });
  await log("SLOT_CREATED", "TimetableSlot", slot.id);
  revalidatePath("/admin/timetable");
  return { ok: "Class added to the timetable." };
}

export async function addHoliday(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await admin();
  const d = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), name: z.string().min(2, "Name the holiday") }).safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  try {
    await prisma.holiday.create({ data: { date: dateFromKey(d.data.date), name: d.data.name } });
    return done("/admin/calendar", `${d.data.name} added.`);
  } catch (e) {
    return friendly(e, "holiday date");
  }
}

// ────────────────────────────── Settings ──────────────────────────────

export async function saveSettings(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await admin();
  const d = z
    .object({
      minAttendancePct: z.coerce.number().int().min(1).max(100),
      lateAfterMin: z.coerce.number().int().min(0).max(120),
      sessionMinutes: z.coerce.number().int().min(1).max(180),
      geoMode: z.enum(["OFF", "FLAG", "REJECT"]),
    })
    .safeParse(fields(fd));
  if (!d.success) return { error: d.error.issues[0].message };
  if (d.data.lateAfterMin > d.data.sessionMinutes) return { error: "The late cut-off must fall inside the marking window." };
  await prisma.settings.upsert({ where: { id: 1 }, update: d.data, create: { id: 1, ...d.data } });
  await log("SETTINGS_SAVED", "Settings", "1", d.data);
  return done("/admin/settings", "Settings saved.");
}
