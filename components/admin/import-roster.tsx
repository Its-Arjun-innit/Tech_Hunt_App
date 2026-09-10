"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importRoster, type ImportedCredential } from "@/app/admin/teams/actions";

const SAMPLE = `Team Name,Member Name,Member Code
Team Alpha,Player 1,A001
Team Alpha,Player 2,A002
Team Beta,Player 1,B001`;

export function ImportRoster() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [pending, startTransition] = useTransition();
  const [credentials, setCredentials] = useState<ImportedCredential[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = () =>
    startTransition(async () => {
      const result = await importRoster(csv);
      setCredentials(result.credentials ?? null);
      setErrors(result.errors ?? []);
      toast[result.ok ? "success" : "error"](result.message);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roster CSV</CardTitle>
          <p className="text-sm text-muted-foreground">
            Columns: team name, member name, member code. The member code is optional and is
            generated when blank. Export from Excel as CSV.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={SAMPLE}
            rows={10}
            className="font-mono text-sm"
          />

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setCsv(await file.text());
                }}
              />
              <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-sm hover:bg-muted">
                <Upload className="size-4" /> Choose file
              </span>
            </label>

            <Button onClick={submit} disabled={pending || !csv.trim()}>
              {pending ? "Importing…" : "Import roster"}
            </Button>

            <Button variant="ghost" onClick={() => setCsv(SAMPLE)}>
              Use sample
            </Button>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4" /> Skipped rows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {credentials && credentials.length > 0 && (
        <Card className="border-emerald-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Login details — shown once, print them now
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              PINs are hashed in the database and cannot be shown again. Reset a PIN from the
              teams page if you lose this list.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-4">Team</th>
                    <th className="py-1 pr-4">Player</th>
                    <th className="py-1 pr-4">Code</th>
                    <th className="py-1">PIN</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1.5 pr-4">{c.teamName}</td>
                      <td className="py-1.5 pr-4">{c.memberName}</td>
                      <td className="py-1.5 pr-4 font-mono">{c.memberCode}</td>
                      <td className="py-1.5 font-mono">{c.pin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" /> Print
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const rows = [
                    "Team,Player,Member Code,PIN",
                    ...credentials.map((c) =>
                      [c.teamName, c.memberName, c.memberCode, c.pin]
                        .map((v) => `"${v.replace(/"/g, '""')}"`)
                        .join(","),
                    ),
                  ].join("\n");
                  const url = URL.createObjectURL(
                    new Blob([rows], { type: "text/csv;charset=utf-8" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "player-credentials.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
