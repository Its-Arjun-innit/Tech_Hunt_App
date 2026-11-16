/**
 * Attendance maths in whole numbers, so 75% of 4 is exactly 3 and never
 * 2.9999.
 *
 * attended counts PRESENT, LATE and EXCUSED; held counts every session that
 * has opened, including one open right now.
 */
export const ATTENDED = ["PRESENT", "LATE", "EXCUSED"] as const;

export type Standing = {
  attended: number;
  held: number;
  /** Rounded down, so 74.9% never shows as 75%. Null when nothing was held. */
  pct: number | null;
  /** Classes that can still be missed while staying at or above the minimum. */
  canMiss: number;
  /** Consecutive classes to attend to get back to the minimum. */
  mustAttend: number;
  below: boolean;
};

export function standing(attended: number, held: number, minPct: number): Standing {
  const pct = held === 0 ? null : Math.floor((attended * 100) / held);
  // attended / (held + k) >= min  →  k <= (100·attended − min·held) / min
  const canMiss = minPct <= 0 ? Infinity : Math.max(0, Math.floor((100 * attended - minPct * held) / minPct));
  // (attended + n) / (held + n) >= min  →  n >= (min·held − 100·attended) / (100 − min)
  const gap = minPct * held - 100 * attended;
  const mustAttend = gap <= 0 ? 0 : minPct >= 100 ? Infinity : Math.ceil(gap / (100 - minPct));
  return { attended, held, pct, canMiss, mustAttend, below: gap > 0 };
}

/** One plain sentence for the attendance card. */
export function standingSentence(s: Standing): string {
  if (s.held === 0) return "No classes held yet";
  if (s.below) {
    return Number.isFinite(s.mustAttend)
      ? `Attend the next ${s.mustAttend} to get back on track`
      : "Below the minimum";
  }
  if (s.canMiss === 0) return "Don't miss the next class";
  return `You can miss ${s.canMiss} more`;
}
