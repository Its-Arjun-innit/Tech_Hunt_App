import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { formatDateKey, keyFromDate } from "@/lib/time";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { addHoliday } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Holidays" };

export default async function CalendarPage() {
  await requireStaff("ADMIN");
  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Holidays" description="No classes show on these dates, for anyone." />
      <ActionForm action={addHoliday} className="flex flex-wrap gap-2">
        <Input name="date" type="date" required aria-label="Date" className="w-40" />
        <Input name="name" placeholder="Diwali" required aria-label="Holiday name" className="sm:w-60" />
        <SubmitButton>Add holiday</SubmitButton>
      </ActionForm>
      <ul className="divide-y rounded-lg border text-sm">
        {holidays.map((h) => (
          <li key={h.id} className="flex items-center justify-between px-4 py-2">
            <span>
              <span className="inline-block w-28 text-muted-foreground">{formatDateKey(keyFromDate(h.date))}</span>
              {h.name}
            </span>
            <DeleteButton kind="holiday" id={h.id} label={h.name} />
          </li>
        ))}
        {holidays.length === 0 && <li className="px-4 py-6 text-center text-muted-foreground">No holidays added.</li>}
      </ul>
    </div>
  );
}
