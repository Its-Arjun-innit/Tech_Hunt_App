import { requireAdmin } from "@/lib/auth/admin";
import { getCurrentGame } from "@/lib/game-engine/current-game";
import { ImportRoster } from "@/components/admin/import-roster";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdmin();
  const game = await getCurrentGame();
  if (!game) return <p className="text-muted-foreground">Create a game first.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Import roster</h1>
        <p className="text-muted-foreground text-sm">
          Paste or upload a CSV of teams and players. PINs are generated for you.
        </p>
      </div>
      <ImportRoster />
    </div>
  );
}
