import { redirect } from "next/navigation";
import { getPlayer } from "@/lib/auth/player";
import { requestMeta } from "@/lib/auth/session";
import { processScan } from "@/lib/game-engine/process-scan";
import { extractToken } from "@/lib/qr/token";
import { ScanTokenResult } from "@/components/player/scan-token-result";

export const dynamic = "force-dynamic";

/**
 * Phone camera apps open the QR as a URL, landing here directly.
 * The scan is processed on the server before anything renders.
 */
export default async function ScanTokenPage({
  params,
}: PageProps<"/scan/[token]">) {
  const { token: raw } = await params;
  const token = extractToken(raw);

  const ctx = await getPlayer();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(`/scan/${raw}`)}`);

  if (!token) {
    return (
      <ScanTokenResult
        outcome={{
          ok: false,
          result: "INVALID_TOKEN",
          message: "That QR code is not recognised.",
        }}
      />
    );
  }

  const { ip, userAgent } = await requestMeta();
  const outcome = await processScan({
    playerId: ctx.player.id,
    teamId: ctx.team.id,
    gameId: ctx.game.id,
    qrToken: token,
    ip,
    userAgent,
  });

  return <ScanTokenResult outcome={outcome} />;
}
