import Link from "next/link";
import { CircleCheck, CircleX, ExternalLink, KeyRound, Map, Sliders } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/qr/token";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/status-badge";

export const dynamic = "force-dynamic";

/**
 * Deployment health, not game configuration. Game rules live under Game
 * controls; this page answers "is this install wired up correctly", which is
 * the question an organizer actually has before an event.
 */
export default async function SettingsPage() {
  const admin = await requireAdmin("SUPER_ADMIN");

  const [admins, games] = await Promise.all([
    prisma.adminUser.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, active: true },
    }),
    prisma.game.count(),
  ]);

  const mapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="How this deployment is configured. Game rules live under Game controls."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="size-4" /> Deployment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Public address" value={<code className="text-xs">{appUrl()}</code>} />
          <Row label="Games created" value={games} />
          <Row
            label="Google Maps"
            value={
              mapsKey ? (
                <StatusPill tone="success" icon={CircleCheck}>Connected</StatusPill>
              ) : (
                <StatusPill tone="neutral" icon={CircleX}>Not configured</StatusPill>
              )
            }
          />
          {!mapsKey && (
            <p className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-subtle px-3 py-2 text-xs">
              <Map className="mt-0.5 size-3.5 shrink-0" />
              Without a key the checkpoint editor and live map fall back to a coordinate grid.
              Everything still works; you just lose the real map. Set
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable it.
            </p>
          )}
          <Row
            label="QR posters point at"
            value={
              <Button variant="link" size="sm" render={<Link href="/admin/qr" />}>
                Review posters <ExternalLink className="size-3" />
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="size-4" /> Organizer accounts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Volunteers are managed on their own page. Admin accounts are created by whoever
            controls the deployment environment.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {admins
            .filter((a) => a.role !== "VOLUNTEER")
            .map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span className="font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.email}</span>
                <span className="ml-auto flex items-center gap-2">
                  <StatusPill tone={a.role === "SUPER_ADMIN" ? "brand" : "neutral"}>
                    {a.role.replace("_", " ").toLowerCase()}
                  </StatusPill>
                  {!a.active && <StatusPill tone="danger">disabled</StatusPill>}
                  {a.id === admin.id && (
                    <span className="text-xs text-faint-foreground">you</span>
                  )}
                </span>
              </div>
            ))}
          <Button variant="outline" size="sm" render={<Link href="/admin/volunteers" />}>
            Manage volunteers
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
