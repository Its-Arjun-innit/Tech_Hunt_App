"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { regenerateQr } from "@/app/admin/checkpoints/actions";

export function QrPanel({
  checkpointId,
  name,
  url,
}: {
  checkpointId: string;
  name: string;
  url: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* Cache-busted so a regenerated code shows immediately. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/qr/${checkpointId}?size=220&v=${encodeURIComponent(url)}`}
        alt={`QR code for ${name}`}
        width={220}
        height={220}
        className="rounded-lg border bg-white p-2"
      />

      <div className="space-y-3 min-w-0">
        <div>
          <p className="text-sm font-medium">Scan URL</p>
          <p className="text-sm text-muted-foreground break-all font-mono">{url}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/api/qr/${checkpointId}?size=1200&download=1`} />}
          >
            <Download className="size-3.5" /> PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/api/qr/${checkpointId}?format=svg&download=1`} />}
          >
            <Download className="size-3.5" /> SVG
          </Button>
          <Button variant="outline" size="sm" render={<a href="/admin/qr" />}>
            <Printer className="size-3.5" /> Print posters
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  "Issue a new QR code? The printed poster stops working immediately.",
                )
              )
                return;
              startTransition(async () => {
                const result = await regenerateQr(checkpointId);
                toast[result.ok ? "success" : "error"](result.message);
                router.refresh();
              });
            }}
          >
            <RefreshCw className="size-3.5" /> Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}
