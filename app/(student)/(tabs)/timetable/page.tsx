import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { requireStudent } from "@/lib/auth/student";
import { addDays, campusClock, DAY_SHORT, dateFromKey, dowOfKey, formatDateKey, formatMin } from "@/lib/time";
import { classesBetween } from "@/lib/timetable/load";
import { AppHeader } from "@/components/app-header";
import { StatusPill } from "@/components/status-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Timetable" };

/** Monday of the week containing `key`. */
function weekStart(key: string) {
  return addDays(key, -((dowOfKey(key) + 6) % 7));
}

export default async function TimetablePage({ searchParams }: PageProps<"/timetable">) {
  const student = await requireStudent();
  const { d } = await searchParams;
  const today = campusClock().dateKey;
  const selected = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  const monday = weekStart(selected);

  const week = await classesBetween({ sectionId: student.sectionId }, monday, 7);
  const day = week.find((w) => w.dateKey === selected)!;
  // Sunday only shows when something is actually on.
  const strip = week.filter((w, i) => i < 6 || w.classes.length > 0);

  return (
    <>
      <AppHeader title="Timetable" subtitle={student.section.name} name={student.name} profileHref="/profile">
        <div className="mt-4 flex items-center gap-1">
          <WeekLink href={`/timetable?d=${addDays(monday, -7)}`} label="Previous week">
            <ChevronLeft className="size-4" />
          </WeekLink>
          <ol className="grid flex-1 grid-flow-col gap-1">
            {strip.map((w) => {
              const active = w.dateKey === selected;
              const isToday = w.dateKey === today;
              return (
                <li key={w.dateKey}>
                  <Link
                    href={`/timetable?d=${w.dateKey}`}
                    aria-current={active ? "date" : undefined}
                    className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
                      active ? "bg-foreground text-background" : "hover:bg-muted"
                    }`}
                  >
                    <span className={active ? "" : "text-muted-foreground"}>{DAY_SHORT[dowOfKey(w.dateKey)]}</span>
                    <span className={`text-sm font-semibold tabular-nums ${isToday && !active ? "text-primary-strong" : ""}`}>
                      {dateFromKey(w.dateKey).getUTCDate()}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <WeekLink href={`/timetable?d=${addDays(monday, 7)}`} label="Next week">
            <ChevronRight className="size-4" />
          </WeekLink>
        </div>
      </AppHeader>

      <main className="mx-auto w-full max-w-lg px-5 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{selected === today ? "Today" : formatDateKey(selected)}</h2>
          {selected !== today && (
            <Link href="/timetable" className="text-sm text-primary-strong underline-offset-4 hover:underline">
              Back to today
            </Link>
          )}
        </div>

        {day.holiday ? (
          <Empty title={day.holiday} body="Holiday, no classes." />
        ) : day.classes.length === 0 ? (
          <Empty title="No classes" body="Nothing scheduled for this day." />
        ) : (
          <ol className="space-y-2">
            {day.classes.map((c) => (
              <li key={c.slotId} className={`flex gap-3 rounded-2xl border bg-surface p-3 ${c.cancelled ? "opacity-70" : ""}`}>
                <div className="w-16 shrink-0 text-xs tabular-nums">
                  <p className="font-semibold">{formatMin(c.startMin)}</p>
                  <p className="text-muted-foreground">{formatMin(c.endMin)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${c.cancelled ? "line-through" : ""}`}>{c.subjectName}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                    <span className="font-mono text-xs">{c.subjectCode}</span>
                    {c.roomName && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {c.roomName}
                      </span>
                    )}
                    <span>{c.teacherName}</span>
                  </p>
                  {(c.cancelled || c.changed) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill tone={c.cancelled ? "danger" : "warning"}>{c.cancelled ? "Cancelled" : "Changed"}</StatusPill>
                      {c.note && <span className="text-xs text-muted-foreground">{c.note}</span>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}

function WeekLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
