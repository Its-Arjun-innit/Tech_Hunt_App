import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, campusClock, campusLocalToDate, dowOfKey, formatMin, parseTime } from "./time";

test("a campus-local date-time becomes the right instant", () => {
  assert.equal(campusLocalToDate("2026-11-17T09:00", "Asia/Kolkata")?.toISOString(), "2026-11-17T03:30:00.000Z");
  assert.equal(campusLocalToDate("2026-11-17T09:00", "UTC")?.toISOString(), "2026-11-17T09:00:00.000Z");
  assert.equal(campusLocalToDate("not a date"), null);
});

test("campus clock uses the campus zone, not the server's", () => {
  // 20:00 UTC on Sunday is 01:30 Monday in India.
  const c = campusClock(new Date("2026-11-15T20:00:00Z"), "Asia/Kolkata");
  assert.deepEqual(c, { dateKey: "2026-11-16", dow: 1, minutes: 90 });
});

test("midnight reads as minute 0, not 24:00", () => {
  const c = campusClock(new Date("2026-11-16T18:30:00Z"), "Asia/Kolkata");
  assert.equal(c.minutes, 0);
  assert.equal(c.dateKey, "2026-11-17");
});

test("date key helpers", () => {
  assert.equal(dowOfKey("2026-11-16"), 1);
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-11-16", -1), "2026-11-15");
});

test("time formatting round trips", () => {
  assert.equal(parseTime("09:30"), 570);
  assert.equal(parseTime("24:00"), null);
  assert.equal(formatMin(570), "9:30 AM");
  assert.equal(formatMin(0), "12:00 AM");
  assert.equal(formatMin(13 * 60 + 5), "1:05 PM");
});
