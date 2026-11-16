import { requireStaff } from "@/lib/auth/staff";
import { audienceOptions } from "@/lib/notices-server";
import { PageHeader } from "@/components/admin/page-header";
import { NoticeComposer } from "@/components/notice-composer";
import { NoticeList } from "@/components/notice-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notices" };

export default async function AdminNotices() {
  const staff = await requireStaff("ADMIN");
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-3">
        <PageHeader title="Notices" description="Everything posted, by anyone." />
        <NoticeComposer audiences={await audienceOptions(staff)} />
      </div>
      <div className="lg:pt-14">
        <NoticeList where={{}} showAuthor />
      </div>
    </div>
  );
}
