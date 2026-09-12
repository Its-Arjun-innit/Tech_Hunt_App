import { Bell, CircleCheck, Flag, HandHelping, MapPin } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { visibleToStaff } from "@/lib/announcements";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-badge";
import { VerifyList } from "@/components/volunteer/verify-list";
import { ReportIssue } from "@/components/volunteer/report-issue";
import { adminLogout } from "@/app/admin/login/actions";

export const metadata = { title: "Volunteer — Campus Hunt" };
export const dynamic = "force-dynamic";

export default async function VolunteerPage() {
  // Any admin role can open this; volunteers are limited to it.
  const volunteer = await requireAdmin("VOLUNTEER");

  const [pending, notices] = await Promise.all([
    prisma.challengeAttempt.findMany({
      where: { status: "PENDING" },
      include: {
        team: { select: { name: true, score: true } },
        challenge: {
          select: {
            title: true,
            type: true,
            points: true,
            prompt: true,
            checkpoint: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const mine = volunteer.checkpointId
    ? pending.filter((p) => p.challenge.checkpoint.id === volunteer.checkpointId)
    : [];
  const others = volunteer.checkpointId
    ? pending.filter((p) => p.challenge.checkpoint.id !== volunteer.checkpointId)
    : pending;

  const forMe = notices.filter((n) => visibleToStaff(n, volunteer.role));

  const shape = (a: (typeof pending)[number]) => ({
    id: a.id,
    teamName: a.team.name,
    challengeTitle: a.challenge.title,
    challengeType: a.challenge.type,
    prompt: a.challenge.prompt,
    points: a.challenge.points,
    checkpointName: a.challenge.checkpoint.name,
    photo: readPhoto(a.payload),
    submittedAt: a.createdAt.toISOString(),
  });

  return (
    <main className="flex-1 pb-10">
      <AutoRefresh seconds={10} showIndicator />

      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <HandHelping className="size-3.5" /> Volunteer
            </p>
            <h1 className="truncate font-semibold">{volunteer.name}</h1>
          </div>
          <form action={adminLogout}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-5 px-5 pt-5">
        {/* One job, stated first. */}
        <section
          className={`rounded-2xl border p-5 ${
            mine.length > 0
              ? "border-warning/40 bg-warning-subtle"
              : "border-primary/30 bg-surface"
          }`}
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="size-3.5" />
            {volunteer.checkpoint ? "Your post" : "Not posted yet"}
          </p>

          {volunteer.checkpoint ? (
            <>
              <p className="mt-2 text-2xl font-semibold leading-tight">
                {volunteer.checkpoint.name}
              </p>
              <p className="mt-2 text-sm">
                {mine.length > 0 ? (
                  <>
                    <strong>
                      {mine.length} team{mine.length === 1 ? "" : "s"}
                    </strong>{" "}
                    waiting for you to verify.
                  </>
                ) : (
                  "Nothing waiting. You are all caught up."
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              An organizer has not posted you to a checkpoint yet. You can still verify any team
              that reaches you.
            </p>
          )}
        </section>

        {forMe.length > 0 && (
          <section className="rounded-xl border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Bell className="size-3.5" /> From the organizers
            </p>
            <ul className="mt-3 space-y-3">
              {forMe.map((n) => (
                <li key={n.id}>
                  <p className="text-sm leading-snug">{n.message}</p>
                  <p className="mt-0.5 text-xs text-faint-foreground">
                    {n.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {mine.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Flag className="size-4" /> At your checkpoint
              <StatusPill tone="warning">{mine.length}</StatusPill>
            </h2>
            <VerifyList attempts={mine.map(shape)} />
          </section>
        )}

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            {mine.length > 0 ? (
              <>Elsewhere on campus</>
            ) : (
              <>
                <CircleCheck className="size-4" /> Waiting for verification
              </>
            )}
            {others.length > 0 && <StatusPill tone="neutral">{others.length}</StatusPill>}
          </h2>
          <VerifyList attempts={others.map(shape)} />
        </section>

        <section className="rounded-xl border bg-surface p-4">
          <h2 className="text-sm font-semibold">Report an issue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A damaged poster, a blocked route, anything an organizer should know.
          </p>
          <div className="mt-3">
            <ReportIssue />
          </div>
        </section>
      </div>
    </main>
  );
}

/** Photo submissions arrive as a data URL inside the attempt payload. */
function readPhoto(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "photo" in payload) {
    const photo = (payload as { photo: unknown }).photo;
    if (typeof photo === "string" && photo.startsWith("data:image/")) return photo;
  }
  return null;
}
