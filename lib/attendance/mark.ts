import "server-only";
import { Prisma, type AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { verifyCode } from "./code";
import { withinRoom, type Coords } from "./geo";

export type MarkOutcome =
  | { ok: true; status: AttendanceStatus; subject: string; flagged: string | null; already?: boolean }
  | { ok: false; reason: "CODE" | "CLOSED" | "NOT_YOUR_CLASS" | "LOCATION" | "RATE_LIMITED"; message: string };

const MAX_WRONG_CODES = 5;
const WRONG_CODE_WINDOW_MS = 10 * 60_000;

/**
 * Marks a student present for the class whose code they entered.
 *
 * Checks, in order: too many wrong codes, which open session the code belongs
 * to (the token narrows it when the QR was scanned; a typed code is tried
 * against every open class of the student's section), and the room radius.
 *
 * Exactly-once comes from the unique (session, student) constraint, not from
 * a read-then-write: two taps racing each other both reach the insert and the
 * loser gets "already marked". Identity always comes from the session cookie;
 * this function never takes a student id from the browser.
 */
export async function markAttendance(input: {
  studentId: string;
  sectionId: string;
  token: string | null;
  code: string;
  coords: Coords | null;
  method: "QR" | "CODE";
  ip: string | null;
}): Promise<MarkOutcome> {
  const now = new Date();

  const wrong = await prisma.auditLog.count({
    where: {
      action: "MARK_WRONG_CODE",
      actorId: input.studentId,
      createdAt: { gte: new Date(now.getTime() - WRONG_CODE_WINDOW_MS) },
    },
  });
  if (wrong >= MAX_WRONG_CODES) {
    return {
      ok: false,
      reason: "RATE_LIMITED",
      message: "Too many wrong codes. Ask your teacher to mark you, or try again in a few minutes.",
    };
  }

  const candidates = await prisma.attendanceSession.findMany({
    where: input.token ? { token: input.token } : { closesAt: { gt: now }, course: { sectionId: input.sectionId } },
    include: { course: { include: { subject: true } }, room: true },
  });

  // A typed code with nothing open is a timing problem, not a guess: say so,
  // and don't count it toward the wrong-code limit.
  if (!input.token && candidates.length === 0) {
    return { ok: false, reason: "CLOSED", message: "No class of yours is taking attendance right now. If yours just closed, speak to your teacher." };
  }

  const session = candidates.find((s) => verifyCode(s.secret, input.code, now.getTime()));
  if (!session) {
    await prisma.auditLog.create({
      data: { actorType: "STUDENT", actorId: input.studentId, action: "MARK_WRONG_CODE", ip: input.ip },
    });
    return { ok: false, reason: "CODE", message: "That code is wrong or has expired. Codes change every 20 seconds." };
  }

  if (session.closesAt <= now) {
    return { ok: false, reason: "CLOSED", message: "Attendance for this class has closed. Speak to your teacher." };
  }
  if (session.course.sectionId !== input.sectionId) {
    return { ok: false, reason: "NOT_YOUR_CLASS", message: "This class is not on your timetable." };
  }

  const subject = session.course.subject.name;
  const existing = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId: session.id, studentId: input.studentId } },
  });
  if (existing) return { ok: true, status: existing.status, subject, flagged: existing.flagReason, already: true };

  const { geoMode } = await getSettings();
  let flagReason: string | null = null;
  let distance: number | null = null;
  const room = session.room;

  if (geoMode !== "OFF" && room?.latitude != null && room.longitude != null) {
    if (!input.coords) {
      flagReason = "Location not shared";
    } else {
      const check = withinRoom({ latitude: room.latitude, longitude: room.longitude, radiusM: room.radiusM }, input.coords);
      distance = check.distance;
      if (!check.ok) flagReason = `${check.distance} m from ${room.name}`;
    }
    if (flagReason && geoMode === "REJECT") {
      return {
        ok: false,
        reason: "LOCATION",
        message: input.coords
          ? `You seem to be ${distance} m from ${room.name}. Move into the room and try again.`
          : "Allow location access so we can confirm you are in the room.",
      };
    }
  }

  const status: AttendanceStatus = now > session.lateAt ? "LATE" : "PRESENT";
  try {
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: input.studentId,
        status,
        method: input.method,
        latitude: input.coords?.latitude ?? null,
        longitude: input.coords?.longitude ?? null,
        distanceM: distance,
        flagged: !!flagReason,
        flagReason,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const won = await prisma.attendanceRecord.findUniqueOrThrow({
        where: { sessionId_studentId: { sessionId: session.id, studentId: input.studentId } },
      });
      return { ok: true, status: won.status, subject, flagged: won.flagReason, already: true };
    }
    throw e;
  }

  return { ok: true, status, subject, flagged: flagReason };
}
