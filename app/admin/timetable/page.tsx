import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { DAY_NAMES, DAY_SHORT, formatMin } from "@/lib/time";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { addSlot } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Timetable" };

const WEEKDAYS = [1, 2, 3, 4, 5, 6];

/** Weekly grid per section. Adding a class is refused if it clashes on section, teacher or room. */
export default async function TimetableAdmin({ searchParams }: PageProps<"/admin/timetable">) {
  await requireStaff("ADMIN");
  const { section } = await searchParams;
  const sections = await prisma.section.findMany({ orderBy: { name: "asc" } });
  const current = sections.find((s) => s.id === section) ?? sections[0];

  const [courses, rooms, slots] = current
    ? await Promise.all([
        prisma.course.findMany({ where: { sectionId: current.id }, include: { subject: true, teacher: true }, orderBy: { subject: { code: "asc" } } }),
        prisma.room.findMany({ orderBy: { name: "asc" } }),
        prisma.timetableSlot.findMany({
          where: { course: { sectionId: current.id } },
          include: { course: { include: { subject: true, teacher: true } }, room: true },
          orderBy: { startMin: "asc" },
        }),
      ])
    : [[], [], []];

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader title="Timetable" description="The weekly plan. One-day changes (cancel, room, substitute) are made by teachers from their Classes tab." />

      <nav aria-label="Sections" className="flex flex-wrap gap-1">
        {sections.map((s) => (
          <Link
            key={s.id}
            href={`/admin/timetable?section=${s.id}`}
            aria-current={s.id === current?.id ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${s.id === current?.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            {s.name}
          </Link>
        ))}
      </nav>

      {current && courses.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {current.name} has no courses. <Link href="/admin/courses" className="underline">Assign some first</Link>.
        </p>
      )}

      {current && courses.length > 0 && (
        <ActionForm action={addSlot} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <NativeSelect name="courseId" required aria-label="Class" className="sm:w-64">
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subject.code} · {c.subject.name} ({c.teacher.name})
              </option>
            ))}
          </NativeSelect>
          <NativeSelect name="dayOfWeek" aria-label="Day" className="w-32">
            {[...WEEKDAYS, 0].map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]}
              </option>
            ))}
          </NativeSelect>
          <Input name="start" type="time" required defaultValue="09:00" aria-label="Starts" className="w-28" />
          <Input name="end" type="time" required defaultValue="10:00" aria-label="Ends" className="w-28" />
          <NativeSelect name="roomId" aria-label="Room" className="w-32">
            <option value="">No room</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
          <SubmitButton>Add class</SubmitButton>
        </ActionForm>
      )}

      {current && (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {WEEKDAYS.map((d) => (
            <section key={d} className="rounded-lg border">
              <h2 className="border-b px-3 py-1.5 text-sm font-semibold">{DAY_SHORT[d]}</h2>
              <ul className="space-y-1 p-2">
                {slots
                  .filter((s) => s.dayOfWeek === d)
                  .map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-1 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                      <span>
                        <span className="block tabular-nums text-muted-foreground">
                          {formatMin(s.startMin)}–{formatMin(s.endMin)}
                        </span>
                        <span className="block font-medium">{s.course.subject.code}</span>
                        <span className="block text-muted-foreground">
                          {s.room?.name ?? "No room"} · {s.course.teacher.name.split(" ")[0]}
                        </span>
                      </span>
                      <DeleteButton kind="slot" id={s.id} label={`${s.course.subject.code} on ${DAY_NAMES[d]}`} />
                    </li>
                  ))}
                {slots.every((s) => s.dayOfWeek !== d) && <li className="px-1 py-2 text-xs text-muted-foreground">Free</li>}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
