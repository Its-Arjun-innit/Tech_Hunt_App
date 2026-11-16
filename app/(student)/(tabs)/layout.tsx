import { requireStudent } from "@/lib/auth/student";
import { prisma } from "@/lib/db";
import { noticesForStudent } from "@/lib/notices";
import { BottomNav } from "@/components/bottom-nav";

/** Shell for the signed-in student tabs. The unread count feeds the Notices badge. */
export default async function StudentTabsLayout({ children }: { children: React.ReactNode }) {
  const student = await requireStudent();
  const unread = await prisma.notice.count({
    where: { ...noticesForStudent(student), reads: { none: { studentId: student.id } } },
  });

  return (
    <div className="flex flex-1 flex-col pb-24">
      {children}
      <BottomNav variant="student" unread={unread} />
    </div>
  );
}
