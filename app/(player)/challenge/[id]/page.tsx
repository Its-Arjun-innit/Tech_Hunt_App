import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Trophy } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { prisma } from "@/lib/db";
import { publicChallengeConfig } from "@/lib/challenges/grade";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChallengeForm } from "@/components/player/challenge-form";

export const dynamic = "force-dynamic";

export default async function ChallengePage({
  params,
}: PageProps<"/challenge/[id]">) {
  const { id } = await params;
  const { team, game } = await requirePlayer();

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { checkpoint: true },
  });
  if (!challenge || challenge.checkpoint.gameId !== game.id) notFound();

  // A team may only open a challenge at a checkpoint it actually reached.
  const arrived = await prisma.scanEvent.findFirst({
    where: { teamId: team.id, checkpointId: challenge.checkpointId, result: "SUCCESS" },
    select: { id: true },
  });
  if (!arrived) {
    return (
      <main className="flex-1 p-5 max-w-lg mx-auto w-full">
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Scan this checkpoint before starting its challenge.
            </p>
            <Button  className="w-full h-11" render={<Link href="/dashboard" />}>Back to dashboard</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const attempts = await prisma.challengeAttempt.findMany({
    where: { teamId: team.id, challengeId: challenge.id },
    orderBy: { createdAt: "asc" },
  });

  const done = attempts.find((a) => a.status === "SUCCESS");
  const pending = attempts.find((a) => a.status === "PENDING");
  const failed = attempts.filter((a) => a.status === "FAILED" && a.note !== "stage cleared").length;
  const stageIndex = attempts.reduce((max, a) => Math.max(max, a.stageIndex), 0);

  return (
    <main className="flex-1 pb-10">
      <header className="flex items-center gap-2 border-b px-3 py-3">
        <Button  variant="ghost" size="sm" render={<Link href="/dashboard" />}><ArrowLeft className="size-4" /> Back</Button>
        <h1 className="font-semibold truncate">{challenge.checkpoint.name}</h1>
      </header>

      <div className="p-5 max-w-lg mx-auto w-full space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{challenge.type.replace("_", " ")}</Badge>
            <Badge variant="outline" className="gap-1">
              <Trophy className="size-3" /> {challenge.points} pts
            </Badge>
            {challenge.timeLimitSeconds && (
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" /> {Math.round(challenge.timeLimitSeconds / 60)} min
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-semibold">{challenge.title}</h2>
          <p className="text-muted-foreground mt-1">{challenge.prompt}</p>
        </div>

        {done ? (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="pt-6 text-center space-y-3">
              <p className="font-medium">Challenge complete</p>
              <p className="text-sm text-muted-foreground">
                Your team earned {done.pointsAwarded} points here.
              </p>
              <Button  className="w-full h-11" render={<Link href="/dashboard" />}>See your next clue</Button>
            </CardContent>
          </Card>
        ) : pending ? (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="pt-6 text-center space-y-3">
              <p className="font-medium">Waiting for a volunteer</p>
              <p className="text-sm text-muted-foreground">
                Your submission is with a volunteer for verification.
              </p>
              <Button  variant="outline" className="w-full h-11" render={<Link href="/dashboard" />}>Back to dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          <ChallengeForm
            challengeId={challenge.id}
            type={challenge.type}
            config={publicChallengeConfig(challenge.type, challenge.config)}
            stageIndex={stageIndex}
            attemptsLeft={Math.max(0, challenge.maxAttempts - failed)}
            penaltyPoints={challenge.penaltyPoints}
          />
        )}
      </div>
    </main>
  );
}
