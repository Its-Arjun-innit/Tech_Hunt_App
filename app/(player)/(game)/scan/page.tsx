import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { Button } from "@/components/ui/button";
import { Scanner } from "@/components/qr/scanner";

export const metadata = { title: "Scan — Campus Hunt" };
export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const { game } = await requirePlayer();

  if (game.status !== "ACTIVE") {
    return (
      <main className="flex-1 px-5 py-6">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="rounded-xl border border-warning/40 bg-warning-subtle px-4 py-3 text-sm">
            Scanning is disabled while the hunt is {game.status.toLowerCase()}. An organizer will
            resume it.
          </div>
          <Button variant="outline" className="h-12 w-full" render={<Link href="/dashboard" />}>
            Back to home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="flex items-center gap-1 px-3 py-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="size-4" /> Home
        </Button>
      </header>
      <Scanner />
    </main>
  );
}
