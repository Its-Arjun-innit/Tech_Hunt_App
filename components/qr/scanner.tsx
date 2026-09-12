"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CameraOff, Keyboard, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitScan } from "@/app/(player)/(game)/scan/actions";
import type { ScanOutcome } from "@/lib/game-engine/process-scan";
import { ScanResultView } from "@/components/player/scan-result";

const ELEMENT_ID = "qr-reader";

export function Scanner() {
  const router = useRouter();
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [pending, startTransition] = useTransition();

  // Guards against the camera firing the same code many times per second.
  const handledRef = useRef(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const handleToken = (token: string) => {
    if (handledRef.current || pending) return;
    handledRef.current = true;
    void scannerRef.current?.stop().catch(() => {});
    startTransition(async () => {
      const result = await submitScan(token);
      setOutcome(result);
      router.refresh();
    });
  };

  useEffect(() => {
    if (manual || outcome) return;
    let cancelled = false;

    // Loaded lazily so the ~200KB scanner never lands in the main bundle.
    import("html5-qrcode")
      .then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
        if (cancelled) return;
        const scanner = new Html5Qrcode(ELEMENT_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;
        return scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => handleToken(decoded),
          () => {}, // per-frame decode misses are normal; ignore them
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError(
            "Camera unavailable. Allow camera access, or enter the code printed on the poster.",
          );
        }
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) void s.stop().then(() => s.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual, outcome]);

  if (outcome) {
    return (
      <ScanResultView
        outcome={outcome}
        onScanAgain={() => {
          handledRef.current = false;
          setOutcome(null);
        }}
      />
    );
  }

  if (manual) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 space-y-4 px-5 pb-6">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("token");
            if (typeof value === "string" && value.trim()) handleToken(value);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="token">Checkpoint code</Label>
            <Input
              id="token"
              name="token"
              placeholder="cp_x8k29fq2mz"
              autoComplete="off"
              autoCapitalize="none"
              className="h-12 text-base font-mono"
              required
            />
            <p className="text-xs text-muted-foreground">
              The code is printed underneath the QR square on the poster.
            </p>
          </div>
          <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
            {pending && <Loader2 className="size-4 motion-safe:animate-spin" />}
            Submit code
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full"
            onClick={() => {
              handledRef.current = false;
              setManual(false);
            }}
          >
            Use the camera instead
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 text-center">
        <h1 className="text-xl font-semibold">Scan checkpoint</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pending ? "Verifying checkpoint…" : "Point your camera at the QR code."}
        </p>
      </div>

      {/* Near-full-screen viewfinder: the scanner is the whole point of this
          screen, so it gets the room. The frame corners are drawn over the
          video rather than by the library, so they follow the theme. */}
      <div className="relative mx-auto mt-4 w-full max-w-lg flex-1 px-5">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-black/90">
          <div
            id={ELEMENT_ID}
            className="size-full [&_video]:size-full [&_video]:object-cover [&_img]:hidden"
          />

          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-[14%]">
              {[
                "left-0 top-0 border-l-4 border-t-4 rounded-tl-xl",
                "right-0 top-0 border-r-4 border-t-4 rounded-tr-xl",
                "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-xl",
                "right-0 bottom-0 border-r-4 border-b-4 rounded-br-xl",
              ].map((c) => (
                <span key={c} className={`absolute size-10 border-primary ${c}`} />
              ))}
            </div>

            {pending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 className="size-7 motion-safe:animate-spin" />
                  <p className="text-sm font-medium">Verifying checkpoint…</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg space-y-3 px-5 pb-4 pt-4">
        {cameraError && (
          <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-subtle px-3 py-2 text-sm">
            <CameraOff className="mt-0.5 size-4 shrink-0" />
            {cameraError}
          </p>
        )}

        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => setManual(true)}
          disabled={pending}
        >
          <Keyboard className="size-4" /> Enter code manually
        </Button>

        {!cameraError && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-faint-foreground">
            <QrCode className="size-3.5" />
            Hold steady, the code scans itself
          </p>
        )}
      </div>
    </div>
  );
}
