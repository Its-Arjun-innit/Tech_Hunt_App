import { requireStaff } from "@/lib/auth/staff";
import { audienceOptions } from "@/lib/notices-server";
import { AppHeader } from "@/components/app-header";
import { NoticeComposer } from "@/components/notice-composer";
import { NoticeList } from "@/components/notice-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notices" };

export default async function TeacherNotices() {
  const staff = await requireStaff();
  const audiences = await audienceOptions(staff);

  return (
    <>
      <AppHeader title="Notices" subtitle="Post to your classes" name={staff.name} profileHref="/teacher/profile" />
      <main className="mx-auto w-full max-w-lg space-y-6 px-5 py-5">
        {audiences.length > 0 ? (
          <NoticeComposer audiences={audiences} />
        ) : (
          <p className="text-sm text-muted-foreground">You can post once the office assigns you a class.</p>
        )}
        <section>
          <h2 className="mb-2 text-sm font-semibold">Your notices</h2>
          <NoticeList where={{ authorId: staff.id }} />
        </section>
      </main>
    </>
  );
}
