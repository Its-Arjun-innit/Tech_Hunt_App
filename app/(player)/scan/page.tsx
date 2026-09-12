import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePlayer } from "@/lib/auth/player";
import { Button } from "@/components/ui/button";
import { Scanner } from "@/components/qr/scanner";

export const metadata = { title: "Scan — Campus Treasure Hunt" };
export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const { game } = await requirePlayer();

  return (
    <main className="flex-1 flex flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-3">
        <Button  variant="ghost" size="sm" render={<Link href="/dashboard" />}><ArrowLeft className="size-4" /> Back</Button>
        <h1 className="font-semibold">Scan checkpoint</h1>
      </header>

      {game.status !== "ACTIVE" ? (
        <div className="p-5 max-w-lg mx-auto w-full">
          <div className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm">
            Scanning is disabled while the game is {game.status.toLowerCase()}.
          </div>
        </div>
      ) : (
        <Scanner />
      )}
    </main>
  );
}
