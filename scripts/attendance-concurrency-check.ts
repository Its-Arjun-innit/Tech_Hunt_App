/**
 * Proves a student is marked exactly once when two requests race: the
 * double-tap, or the same code typed on two phones at once.
 *
 * Needs the local database seeded (npm run db:seed). Opens a throwaway
 * session, fires two marks in parallel, asserts one row, then cleans up.
 *
 *   npx tsx scripts/attendance-concurrency-check.ts
 */
import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { currentCode, newSecret } from "../lib/attendance/code";
import { generateAttendanceToken } from "../lib/qr/token";
import { campusClock, dateFromKey } from "../lib/time";

import Module from "node:module";

// mark.ts imports "server-only", which only Next resolves (to an empty module).
// Point it at that same empty module here.
const M = Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string };
const resolve = M._resolveFilename;
M._resolveFilename = function (req, ...rest) {
  return req === "server-only"
    ? require.resolve("next/dist/compiled/server-only/empty.js")
    : resolve.call(this, req, ...rest);
};

async function main() {
  const { markAttendance } = await import("../lib/attendance/mark");
  const student = await prisma.student.findFirstOrThrow({ orderBy: { rollNo: "asc" } });
  const course = await prisma.course.findFirstOrThrow({ where: { sectionId: student.sectionId } });

  const now = Date.now();
  const session = await prisma.attendanceSession.create({
    data: {
      courseId: course.id,
      openedById: course.teacherId,
      date: dateFromKey(campusClock().dateKey),
      token: generateAttendanceToken(),
      secret: newSecret(),
      lateAt: new Date(now + 10 * 60_000),
      closesAt: new Date(now + 15 * 60_000),
    },
  });

  try {
    const { code } = currentCode(session.secret);
    const mark = () =>
      markAttendance({ studentId: student.id, sectionId: student.sectionId, token: session.token, code, coords: null, method: "QR", ip: null });
    const [a, b] = await Promise.all([mark(), mark()]);

    assert.equal(a.ok && b.ok, true, `both calls should report success: ${JSON.stringify([a, b])}`);
    const rows = await prisma.attendanceRecord.count({ where: { sessionId: session.id, studentId: student.id } });
    assert.equal(rows, 1, `expected exactly one record, found ${rows}`);

    const wrong = await markAttendance({
      studentId: student.id, sectionId: student.sectionId, token: session.token, code: "000000", coords: null, method: "CODE", ip: null,
    });
    // A wrong code is refused (unless it happens to be the live code, 1 in a million).
    if (code !== "000000") assert.equal(wrong.ok, false);

    console.log("OK: two parallel marks produced one record; a wrong code was refused.");
  } finally {
    await prisma.attendanceSession.delete({ where: { id: session.id } });
    await prisma.auditLog.deleteMany({ where: { action: "MARK_WRONG_CODE", actorId: student.id } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
