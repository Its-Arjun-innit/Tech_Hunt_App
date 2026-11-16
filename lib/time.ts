/**
 * Campus wall-clock time.
 *
 * Servers run in UTC, a college does not. Every "which class is now" question
 * goes through here so the timetable never drifts by the server's offset.
 */
export const CAMPUS_TZ = process.env.CAMPUS_TZ || "Asia/Kolkata";

const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type CampusClock = {
  /** YYYY-MM-DD in campus time. */
  dateKey: string;
  /** 0 = Sunday. */
  dow: number;
  /** Minutes since campus midnight. */
  minutes: number;
};

export function campusClock(now: Date = new Date(), tz: string = CAMPUS_TZ): CampusClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    dow: DAY_INDEX[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** A YYYY-MM-DD key as the Date Prisma stores in a @db.Date column. */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function keyFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Day of week for a date key, independent of time zone. */
export function dowOfKey(key: string): number {
  return dateFromKey(key).getUTCDay();
}

export function addDays(key: string, days: number): string {
  const d = dateFromKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return keyFromDate(d);
}

/** 570 → "9:30". */
export function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "09:30" (from <input type="time">) → 570. */
export function parseTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function toTimeInput(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/**
 * "2026-11-17T09:00" from <input type="datetime-local">, read as campus
 * time, to the real instant. The browser's own zone is irrelevant.
 */
export function campusLocalToDate(value: string, tz: string = CAMPUS_TZ): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const wanted = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Ask what the campus clock reads at that UTC instant; the gap is the offset.
  const c = campusClock(new Date(wanted), tz);
  const shown = dateFromKey(c.dateKey).getTime() + c.minutes * 60_000;
  return new Date(wanted - (shown - wanted));
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Mon 17 Nov" for a date key. */
export function formatDateKey(key: string): string {
  return dateFromKey(key).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "in 25 min", "in 1 h 5 min". */
export function formatIn(minutes: number): string {
  if (minutes < 60) return `in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `in ${h} h ${m} min` : `in ${h} h`;
}
