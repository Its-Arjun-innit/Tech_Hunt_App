import "server-only";
import { prisma } from "@/lib/db";
import { addDays, dateFromKey, dowOfKey, keyFromDate } from "@/lib/time";
import { classesOn, type ResolvedClass } from "./resolve";

export type ClassView = ResolvedClass & {
  dateKey: string;
  subjectCode: string;
  subjectName: string;
  sectionId: string;
  sectionName: string;
  roomName: string | null;
  teacherName: string;
};

export type DayView = { dateKey: string; holiday: string | null; classes: ClassView[] };

type Who = { sectionId: string } | { teacherId: string };

/**
 * The real classes for a section or a teacher over `days` days from
 * `fromKey`, with holidays and one-day changes applied by classesOn.
 *
 * A teacher sees classes they normally take (including ones handed to a
 * substitute, so they know) and classes they are covering for someone else.
 */
export async function classesBetween(who: Who, fromKey: string, days = 1): Promise<DayView[]> {
  const from = dateFromKey(fromKey);
  const to = dateFromKey(addDays(fromKey, days - 1));
  const inRange = { gte: from, lte: to };

  const where =
    "sectionId" in who
      ? { course: { sectionId: who.sectionId } }
      : {
          OR: [
            { course: { teacherId: who.teacherId } },
            { exceptions: { some: { date: inRange, substituteId: who.teacherId } } },
          ],
        };

  const [slots, holidays, rooms] = await Promise.all([
    prisma.timetableSlot.findMany({
      where,
      include: {
        course: {
          include: {
            subject: { select: { code: true, name: true } },
            section: { select: { id: true, name: true } },
            teacher: { select: { name: true } },
          },
        },
        exceptions: { where: { date: inRange }, include: { substitute: { select: { name: true } } } },
      },
    }),
    prisma.holiday.findMany({ where: { date: inRange } }),
    prisma.room.findMany({ select: { id: true, name: true } }),
  ]);

  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  const holidayOn = new Map(holidays.map((h) => [keyFromDate(h.date), h.name]));
  const bySlot = new Map(slots.map((s) => [s.id, s]));

  return Array.from({ length: days }, (_, i) => {
    const dateKey = addDays(fromKey, i);
    const holiday = holidayOn.get(dateKey) ?? null;
    const exceptions = slots.flatMap((s) => s.exceptions.filter((e) => keyFromDate(e.date) === dateKey));

    let resolved = classesOn(
      dowOfKey(dateKey),
      slots.map((s) => ({ ...s, teacherId: s.course.teacherId })),
      exceptions,
      !!holiday,
    );
    if ("teacherId" in who) {
      resolved = resolved.filter((c) => c.teacherId === who.teacherId || c.regularTeacherId === who.teacherId);
    }

    const classes = resolved.map((c) => {
      const s = bySlot.get(c.slotId)!;
      const sub = s.exceptions.find((e) => keyFromDate(e.date) === dateKey)?.substitute;
      return {
        ...c,
        dateKey,
        subjectCode: s.course.subject.code,
        subjectName: s.course.subject.name,
        sectionId: s.course.section.id,
        sectionName: s.course.section.name,
        roomName: c.roomId ? (roomName.get(c.roomId) ?? null) : null,
        teacherName: sub?.name ?? s.course.teacher.name,
      };
    });
    return { dateKey, holiday, classes };
  });
}
