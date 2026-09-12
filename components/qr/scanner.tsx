"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CameraOff, Keyboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitScan } from "@/app/(player)/scan/actions";
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

  return (
    <div className="flex-1 p-5 max-w-lg mx-auto w-full space-y-4">
      {!manual && (
        <>
          <div
            id={ELEMENT_ID}
            className="overflow-hidden rounded-xl border bg-muted aspect-square [&_video]:size-full [&_video]:object-cover"
          />
          <p className="text-center text-sm text-muted-foreground">
            {pending ? "Checking your scan…" : "Point your camera at the checkpoint QR code."}
          </p>
        </>
      )}

      {cameraError && !manual && (
        <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-sm">
          <CameraOff className="size-4 mt-0.5 shrink-0" />
          {cameraError}
        </p>
      )}

      {manual ? (
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
              className="h-12 text-base"
              required
            />
          </div>
          <Button type="submit" className="w-full h-12" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Submit code
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              handledRef.current = false;
              setManual(false);
            }}
          >
            Use the camera instead
          </Button>
        </form>
      ) : (
        <Button variant="outline" className="w-full h-11" onClick={() => setManual(true)}>
          <Keyboard className="size-4" /> Enter code manually
        </Button>
      )}
    </div>
  );
}
