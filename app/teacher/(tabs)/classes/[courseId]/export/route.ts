import { NextResponse } from "next/server";
import { courseForStaff, getStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ATTENDED, standing } from "@/lib/attendance/stats";
import { keyFromDate } from "@/lib/time";

const LETTER = { PRESENT: "P", LATE: "L", ABSENT: "A", EXCUSED: "E" } as const;

function cell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * The register as a spreadsheet: one row per student, one column per class,
 * P / L / A / E, then totals. Opens in Excel as is.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const staff = await getStaff();
  if (!staff) return new NextResponse("Unauthorized", { status: 401 });
  const { courseId } = await params;
  const course = await courseForStaff(staff, courseId);
  if (!course) return new NextResponse("Not found", { status: 404 });

  const [{ minAttendancePct }, students, sessions] = await Promise.all([
    getSettings(),
    prisma.student.findMany({ where: { sectionId: course.sectionId }, orderBy: { rollNo: "asc" } }),
    prisma.attendanceSession.findMany({
      where: { courseId, openedAt: { lte: new Date() } },
      include: { records: true },
      orderBy: { openedAt: "asc" },
    }),
  ]);

  const header = ["Roll No", "Name", ...sessions.map((s) => keyFromDate(s.date)), "Attended", "Held", "%"];
  const lines = [header.map(cell).join(",")];
  for (const st of students) {
    let attended = 0;
    const marks = sessions.map((s) => {
      const r = s.records.find((x) => x.studentId === st.id);
      if (r && (ATTENDED as readonly string[]).includes(r.status)) attended++;
      return r ? LETTER[r.status] : "A";
    });
    const s = standing(attended, sessions.length, minAttendancePct);
    lines.push([st.rollNo, st.name, ...marks, attended, sessions.length, s.pct ?? ""].map(cell).join(","));
  }

  const name = `${course.subject.code}-${course.section.name}-attendance.csv`.replace(/[^a-z0-9.-]+/gi, "-");
  // BOM so Excel reads UTF-8 names correctly.
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` },
  });
}
