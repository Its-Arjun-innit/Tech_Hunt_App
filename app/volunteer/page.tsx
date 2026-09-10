import { HandHelping } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifyList } from "@/components/volunteer/verify-list";
import { ReportIssue } from "@/components/volunteer/report-issue";
import { adminLogout } from "@/app/admin/login/actions";

export const metadata = { title: "Volunteer — Campus Treasure Hunt" };
export const dynamic = "force-dynamic";

export default async function VolunteerPage() {
  // Any admin role can open this; volunteers are limited to it.
  const volunteer = await requireAdmin("VOLUNTEER");

  const pending = await prisma.challengeAttempt.findMany({
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
  });

  // A volunteer posted to a checkpoint sees theirs first.
  const mine = volunteer.checkpointId
    ? pending.filter((p) => p.challenge.checkpoint.id === volunteer.checkpointId)
    : [];
  const others = volunteer.checkpointId
    ? pending.filter((p) => p.challenge.checkpoint.id !== volunteer.checkpointId)
    : pending;

  return (
    <main className="flex-1 pb-10">
      <AutoRefresh seconds={10} />

      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HandHelping className="size-3.5" /> Volunteer
            </p>
            <h1 className="font-semibold truncate">{volunteer.name}</h1>
          </div>
          <form action={adminLogout}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="px-5 pt-5 space-y-5 max-w-lg mx-auto w-full">
        {volunteer.checkpoint && (
          <p className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
            You are posted at <strong>{volunteer.checkpoint.name}</strong>.
          </p>
        )}

        {mine.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">At your checkpoint</CardTitle>
            </CardHeader>
            <CardContent>
              <VerifyList
                attempts={mine.map((a) => ({
                  id: a.id,
                  teamName: a.team.name,
                  challengeTitle: a.challenge.title,
                  challengeType: a.challenge.type,
                  prompt: a.challenge.prompt,
                  points: a.challenge.points,
                  checkpointName: a.challenge.checkpoint.name,
                  photo: readPhoto(a.payload),
                  submittedAt: a.createdAt.toISOString(),
                }))}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {mine.length > 0 ? "Other checkpoints" : "Waiting for verification"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VerifyList
              attempts={others.map((a) => ({
                id: a.id,
                teamName: a.team.name,
                challengeTitle: a.challenge.title,
                challengeType: a.challenge.type,
                prompt: a.challenge.prompt,
                points: a.challenge.points,
                checkpointName: a.challenge.checkpoint.name,
                photo: readPhoto(a.payload),
                submittedAt: a.createdAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report an issue</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportIssue />
          </CardContent>
        </Card>
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
