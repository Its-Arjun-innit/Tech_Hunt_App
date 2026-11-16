import { requireStaff } from "@/lib/auth/staff";
import { BottomNav } from "@/components/bottom-nav";

export default async function TeacherTabsLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div className="flex flex-1 flex-col pb-24">
      {children}
      <BottomNav variant="teacher" />
    </div>
  );
}
