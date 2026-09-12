import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { scanUrl } from "@/lib/qr/token";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";

export default async function QrPostersPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  const checkpoints = await prisma.checkpoint.findMany({
    where: { gameId: game.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold">QR posters</h1>
        <p className="text-muted-foreground text-sm">
          One poster per page. Print, then tape each at its checkpoint.
        </p>
        <div className="mt-3">
          <PrintButton label="Print all posters" />
        </div>
      </div>

      <div className="space-y-6">
        {checkpoints.map((cp, i) => (
          <section
            key={cp.id}
            className="rounded-lg border p-8 text-center break-after-page print:border-0 print:min-h-screen print:flex print:flex-col print:justify-center"
          >
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              {game.name}
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Checkpoint {String(i + 1).padStart(2, "0")}
            </h2>
            <p className="text-xl">{cp.name}</p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${cp.id}?size=640`}
              alt={`QR code for ${cp.name}`}
              width={320}
              height={320}
              className="mx-auto my-6 bg-white p-3"
            />

            <p className="text-lg font-medium">Scan this code with the hunt app</p>
            <p className="text-sm text-muted-foreground mt-1">
              Open the app, tap Scan QR, and point your camera here.
            </p>
            <p className="mt-4 text-xs text-muted-foreground font-mono break-all">
              {scanUrl(cp.qrToken)}
            </p>
            {!cp.active && (
              <p className="mt-3 text-sm text-danger print:hidden">
                This checkpoint is currently disabled.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
