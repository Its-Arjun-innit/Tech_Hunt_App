/**
 * Turns the weekly timetable plus one-day changes into the classes that
 * actually happen on a date.
 *
 * Pure: callers load rows, this decides. The home card, day view, week view
 * and the teacher's "start attendance" button all call it, so there is one
 * answer to "what is on right now". See lib/timetable/load.ts for the query.
 */

export type SlotRow = {
  id: string;
  courseId: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  roomId: string | null;
  teacherId: string;
};

export type ExceptionRow = {
  slotId: string;
  cancelled: boolean;
  startMin: number | null;
  endMin: number | null;
  roomId: string | null;
  substituteId: string | null;
  note: string | null;
};

export type ResolvedClass = {
  slotId: string;
  courseId: string;
  startMin: number;
  endMin: number;
  roomId: string | null;
  /** Who actually takes the class: the substitute when there is one. */
  teacherId: string;
  regularTeacherId: string;
  cancelled: boolean;
  /** Time, room or teacher differs from the weekly plan. */
  changed: boolean;
  note: string | null;
};

export function classesOn(
  dow: number,
  slots: SlotRow[],
  exceptions: ExceptionRow[],
  isHoliday = false,
): ResolvedClass[] {
  if (isHoliday) return [];
  const bySlot = new Map(exceptions.map((e) => [e.slotId, e]));

  return slots
    .filter((s) => s.dayOfWeek === dow)
    .map((s) => {
      const e = bySlot.get(s.id);
      const startMin = e?.startMin ?? s.startMin;
      const endMin = e?.endMin ?? s.endMin;
      const roomId = e?.roomId ?? s.roomId;
      const teacherId = e?.substituteId ?? s.teacherId;
      return {
        slotId: s.id,
        courseId: s.courseId,
        startMin,
        endMin,
        roomId,
        teacherId,
        regularTeacherId: s.teacherId,
        cancelled: e?.cancelled ?? false,
        changed:
          !!e &&
          (startMin !== s.startMin || endMin !== s.endMin || roomId !== s.roomId || teacherId !== s.teacherId),
        note: e?.note ?? null,
      };
    })
    .sort((a, b) => a.startMin - b.startMin);
}

/** The class running now, else the next one today. Cancelled classes are skipped. */
export function nowAndNext<T extends ResolvedClass>(classes: T[], minutes: number): { now: T | null; next: T | null } {
  const live = classes.filter((c) => !c.cancelled);
  return {
    now: live.find((c) => c.startMin <= minutes && minutes < c.endMin) ?? null,
    next: live.find((c) => c.startMin > minutes) ?? null,
  };
}

export type ClashCandidate = {
  id?: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  roomId: string | null;
  teacherId: string;
  sectionId: string;
  label?: string;
};

/**
 * First existing slot that cannot run alongside the candidate: same day,
 * overlapping time, and sharing a room, a teacher or a section. Back-to-back
 * classes (one ends at 10:00, the next starts at 10:00) do not clash.
 */
export function findClash(candidate: ClashCandidate, existing: ClashCandidate[]) {
  for (const s of existing) {
    if (candidate.id && s.id === candidate.id) continue;
    if (s.dayOfWeek !== candidate.dayOfWeek) continue;
    if (!(candidate.startMin < s.endMin && s.startMin < candidate.endMin)) continue;
    if (s.sectionId === candidate.sectionId) return { slot: s, reason: "section" as const };
    if (s.teacherId === candidate.teacherId) return { slot: s, reason: "teacher" as const };
    if (candidate.roomId && s.roomId === candidate.roomId) return { slot: s, reason: "room" as const };
  }
  return null;
}
