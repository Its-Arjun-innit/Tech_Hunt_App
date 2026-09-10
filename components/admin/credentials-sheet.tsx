"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { regenerateAllPins, type ImportedCredential } from "@/app/admin/teams/actions";

type Roster = { teamName: string; memberName: string; memberCode: string };

export function CredentialsSheet({
  gameName,
  players,
}: {
  gameName: string;
  players: Roster[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issued, setIssued] = useState<ImportedCredential[] | null>(null);

  const rows: (Roster & { pin?: string })[] = issued ?? players;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 print:hidden">
        <ConfirmButton
          variant="destructive"
          disabled={pending}
          title="Issue a new PIN for every player?"
          description="Every existing PIN stops working at once and all players are signed out, including any mid-game. The new list is shown only once, so print it before leaving the page."
          confirmLabel="Issue new PINs"
          onConfirm={() =>
            new Promise<void>((resolve) =>
              startTransition(async () => {
                const result = await regenerateAllPins();
                setIssued(result.credentials ?? null);
                toast[result.ok ? "success" : "error"](result.message);
                router.refresh();
                resolve();
              }),
            )
          }
        >
          <KeyRound className="size-4" />
          {pending ? "Issuing…" : "Issue new PINs for everyone"}
        </ConfirmButton>

        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" /> Print this sheet
        </Button>
      </div>

      {issued && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm print:hidden">
          These PINs are shown once. Print or download before leaving this page.
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{gameName} — login details</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-4">Team name</th>
                    <th className="py-1 pr-4">Player</th>
                    <th className="py-1 pr-4">Member code</th>
                    <th className="py-1">PIN</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1.5 pr-4">{r.teamName}</td>
                      <td className="py-1.5 pr-4">{r.memberName}</td>
                      <td className="py-1.5 pr-4 font-mono">{r.memberCode}</td>
                      <td className="py-1.5 font-mono">
                        {r.pin ?? <span className="text-muted-foreground">••••••</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
