/**
 * Demo college: one department, two sections, five subjects, a weekly
 * timetable and two weeks of attendance history, so every screen has
 * something real on it.
 *
 * WIPES EVERY TABLE. It refuses to run against anything but a local
 * database unless SEED_FORCE=1 is set.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, campusClock, campusLocalToDate, dateFromKey, dowOfKey, toTimeInput } from "../lib/time";
import { newSecret } from "../lib/attendance/code";
import { generateAttendanceToken } from "../lib/qr/token";
import { resolveDatabaseEnv } from "../lib/db-env";

resolveDatabaseEnv();
const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && process.env.SEED_FORCE !== "1") {
  console.error("Refusing to seed: DATABASE_URL is not a local database. Set SEED_FORCE=1 if you really mean it.");
  process.exit(1);
}

const prisma = new PrismaClient();

// Deterministic randomness so the demo looks the same every time.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(42);

const SUBJECTS = [
  { code: "CS301", name: "Data Structures" },
  { code: "CS302", name: "Operating Systems" },
  { code: "CS303", name: "Database Systems" },
  { code: "CS304", name: "Computer Networks" },
  { code: "MA301", name: "Discrete Mathematics" },
];
const TEACHERS = [
  { name: "Anita Rao", email: "anita@campus.edu", role: "HOD" as const },
  { name: "Vikram Iyer", email: "vikram@campus.edu", role: "TEACHER" as const },
  { name: "Meera Shah", email: "meera@campus.edu", role: "TEACHER" as const },
  { name: "Rahul Nair", email: "rahul@campus.edu", role: "TEACHER" as const },
  { name: "Divya Menon", email: "divya@campus.edu", role: "TEACHER" as const },
];
// Five periods with a break and lunch.
const PERIODS = [
  [540, 600],
  [600, 660],
  [675, 735],
  [795, 855],
  [855, 915],
];
const FIRST = ["Aarav", "Diya", "Ishaan", "Kavya", "Arjun", "Ananya", "Rohan", "Saanvi", "Kabir", "Meera", "Vivaan", "Aditi", "Reyansh", "Tara", "Aryan", "Nisha", "Dev", "Pooja", "Karan", "Riya"];
const LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Gupta", "Nair", "Singh", "Das", "Kulkarni", "Joshi"];

async function main() {
  // Children before parents.
  await prisma.$transaction([
    prisma.noticeRead.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.attendanceSession.deleteMany(),
    prisma.slotException.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.course.deleteMany(),
    prisma.studentSession.deleteMany(),
    prisma.student.deleteMany(),
    prisma.staffSession.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.section.deleteMany(),
    prisma.department.deleteMany(),
    prisma.room.deleteMany(),
    prisma.holiday.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.settings.deleteMany(),
  ]);
  await prisma.settings.create({ data: { id: 1 } });

  const dept = await prisma.department.create({ data: { name: "Computer Science and Engineering", code: "CSE" } });
  const sections = await Promise.all(
    ["CSE-A", "CSE-B"].map((name) => prisma.section.create({ data: { name, departmentId: dept.id, year: 2, semester: 3 } })),
  );
  const subjects = await Promise.all(SUBJECTS.map((s) => prisma.subject.create({ data: { ...s, departmentId: dept.id } })));

  // A cluster of rooms ~40 m apart. The lab has no location: code-only.
  const rooms = await Promise.all([
    prisma.room.create({ data: { name: "Room 101", building: "Block A", latitude: 12.97160, longitude: 77.59460, radiusM: 60 } }),
    prisma.room.create({ data: { name: "Room 102", building: "Block A", latitude: 12.97195, longitude: 77.59460, radiusM: 60 } }),
    prisma.room.create({ data: { name: "Lab 1", building: "Block B" } }),
  ]);

  const staffHash = await bcrypt.hash("teach1234", 10);
  await prisma.staff.create({
    data: { name: "College Admin", email: "admin@campus.edu", role: "ADMIN", passwordHash: await bcrypt.hash("admin1234", 10) },
  });
  const teachers = await Promise.all(
    TEACHERS.map((t) => prisma.staff.create({ data: { ...t, departmentId: dept.id, passwordHash: staffHash } })),
  );

  // Teacher i takes subject i in both sections.
  const courses = new Map<string, string>(); // `${section}:${subject}` → course id
  for (const sec of sections) {
    for (const [i, sub] of subjects.entries()) {
      const c = await prisma.course.create({ data: { subjectId: sub.id, sectionId: sec.id, teacherId: teachers[i].id } });
      courses.set(`${sec.id}:${i}`, c.id);
    }
  }

  // Mon–Fri. Section B runs two subjects ahead of A, so at any period the two
  // sections have different subjects and therefore different teachers.
  const slots: { id: string; sectionIdx: number; dow: number; startMin: number; courseId: string; teacherId: string }[] = [];
  for (let dow = 1; dow <= 5; dow++) {
    for (const [p, [startMin, endMin]] of PERIODS.entries()) {
      for (const [s, sec] of sections.entries()) {
        const subjectIdx = (dow + p + s * 2) % 5;
        const courseId = courses.get(`${sec.id}:${subjectIdx}`)!;
        // The networks course uses the lab on Fridays.
        const roomId = subjectIdx === 3 && dow === 5 ? rooms[2].id : rooms[s].id;
        const slot = await prisma.timetableSlot.create({ data: { courseId, roomId, dayOfWeek: dow, startMin, endMin } });
        slots.push({ id: slot.id, sectionIdx: s, dow, startMin, courseId, teacherId: teachers[subjectIdx].id });
      }
    }
  }

  const pinHash = await bcrypt.hash("123456", 10);
  const students: { id: string; sectionIdx: number; rate: number }[] = [];
  for (const [s, sec] of sections.entries()) {
    for (let i = 1; i <= 20; i++) {
      const name = `${FIRST[(i + s * 7) % FIRST.length]} ${LAST[(i * 3 + s) % LAST.length]}`;
      const st = await prisma.student.create({
        data: { rollNo: `23CS${sec.name.slice(-1)}${String(i).padStart(3, "0")}`, name, sectionId: sec.id, pinHash },
      });
      // Most students attend well; a few drift below 75%.
      students.push({ id: st.id, sectionIdx: s, rate: i % 6 === 0 ? 0.62 : 0.8 + rand() * 0.18 });
    }
  }

  // Two weeks of history, up to yesterday. Today stays clean so a teacher can start a session.
  const today = campusClock().dateKey;
  const records: Prisma.AttendanceRecordCreateManyInput[] = [];
  for (let back = 14; back >= 1; back--) {
    const key = addDays(today, -back);
    const dow = dowOfKey(key);
    for (const slot of slots.filter((x) => x.dow === dow)) {
      const openedAt = campusLocalToDate(`${key}T${toTimeInput(slot.startMin + 2)}`)!;
      const session = await prisma.attendanceSession.create({
        data: {
          courseId: slot.courseId,
          slotId: slot.id,
          openedById: slot.teacherId,
          date: dateFromKey(key),
          token: generateAttendanceToken(),
          secret: newSecret(),
          openedAt,
          lateAt: new Date(openedAt.getTime() + 10 * 60_000),
          closesAt: new Date(openedAt.getTime() + 15 * 60_000),
        },
      });
      for (const st of students.filter((x) => x.sectionIdx === slot.sectionIdx)) {
        if (rand() > st.rate) continue; // absent: no row
        const late = rand() < 0.08;
        const flagged = rand() < 0.02;
        records.push({
          sessionId: session.id,
          studentId: st.id,
          status: late ? "LATE" : "PRESENT",
          method: rand() < 0.85 ? "QR" : "CODE",
          flagged,
          flagReason: flagged ? "Location not shared" : null,
          createdAt: new Date(openedAt.getTime() + (late ? 11 : 2) * 60_000),
        });
      }
    }
  }
  await prisma.attendanceRecord.createMany({ data: records });

  await prisma.holiday.create({ data: { date: dateFromKey(addDays(today, 9)), name: "Founders' Day" } });
  await prisma.notice.createMany({
    data: [
      {
        authorId: teachers[0].id,
        title: "Mid-semester exams start next Monday",
        body: "The exam timetable is up on the department board. Hall tickets from the office from Thursday.",
        audience: "DEPARTMENT",
        targetId: dept.id,
        pinned: true,
      },
      {
        authorId: teachers[1].id,
        title: "OS assignment 2 due Friday",
        body: "Submit the scheduler simulation as a single PDF. Late submissions lose 10% per day.",
        audience: "SECTION",
        targetId: sections[0].id,
      },
    ],
  });

  console.log(`
Seeded ${students.length} students, ${teachers.length} teachers, ${slots.length} weekly classes, ${records.length} attendance marks.

Admin      admin@campus.edu   / admin1234
Teachers   anita@campus.edu (HOD), vikram@, meera@, rahul@, divya@  / teach1234
Students   23CSA001 … 23CSA020, 23CSB001 … 23CSB020  / PIN 123456
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
