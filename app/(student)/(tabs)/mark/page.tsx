import { requireStudent } from "@/lib/auth/student";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { MarkFlow } from "@/components/student/mark-flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mark attendance" };

export default async function MarkPage() {
  const student = await requireStudent();
  const [{ geoMode }, open] = await Promise.all([
    getSettings(),
    prisma.attendanceSession.findFirst({
      where: { closesAt: { gt: new Date() }, course: { sectionId: student.sectionId } },
      include: { course: { include: { subject: true } } },
    }),
  ]);

  return (
    <MarkFlow
      needLocation={geoMode !== "OFF"}
      openHint={open ? `${open.course.subject.name} is open. Scan the code on the board.` : null}
    />
  );
}
