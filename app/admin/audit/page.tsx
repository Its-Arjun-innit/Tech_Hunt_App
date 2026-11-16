import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireStaff("ADMIN");
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Audit log" description="Sign-ins, wrong codes, overrides and every admin change. The last 300." />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">On</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                  {l.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: process.env.CAMPUS_TZ || "Asia/Kolkata" })}
                </td>
                <td className="px-3 py-1.5">{l.actorName ?? l.actorType.toLowerCase()}</td>
                <td className="px-3 py-1.5 font-mono text-xs">{l.action}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{l.entity ? `${l.entity} ${l.entityId?.slice(0, 12) ?? ""}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
