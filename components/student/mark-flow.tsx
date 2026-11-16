"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CameraOff, CircleCheck, CircleX, Clock, Keyboard, Loader2, MapPin, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitMark } from "@/app/(student)/actions";
import type { MarkOutcome } from "@/lib/attendance/mark";
import { parseScan } from "@/lib/qr/parse";

const ELEMENT_ID = "qr-reader";

type Step = { kind: "scan" } | { kind: "type" } | { kind: "working"; label: string } | { kind: "done"; outcome: MarkOutcome };

/** Position or null. Never throws and never waits more than ~10 s. */
function locate(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    ),
  );
}

/**
 * Scan or type → location → result, at most three screens.
 *
 * The rotating code is checked on the server; location is sent along when
 * the college checks it. Started from a camera deep link, it skips straight
 * to submitting.
 */
export function MarkFlow({
  needLocation,
  initial,
  openHint,
}: {
  needLocation: boolean;
  initial?: { token: string; code: string | null };
  openHint?: string | null;
}) {
  const [step, setStep] = useState<Step>(initial && !initial.code ? { kind: "type" } : { kind: "scan" });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [notACode, setNotACode] = useState(false);
  const busy = useRef(false);
  const tokenRef = useRef<string | null>(initial?.token ?? null);

  async function submit(token: string | null, code: string, method: "QR" | "CODE") {
    if (busy.current) return;
    busy.current = true;
    let coords = null;
    if (needLocation) {
      setStep({ kind: "working", label: "Checking you're in the room…" });
      coords = await locate();
    }
    setStep({ kind: "working", label: "Marking attendance…" });
    try {
      const outcome = await submitMark({ token, code, method, coords });
      setStep({ kind: "done", outcome });
    } catch {
      setStep({
        kind: "done",
        outcome: { ok: false, reason: "CODE", message: "Couldn't reach the server. Check your connection and try again." },
      });
    } finally {
      busy.current = false;
    }
  }

  // Camera deep link: the code is already in the URL. A timer rather than a
  // direct call, so React's dev double-mount cancels the first one and the
  // mark is sent once.
  useEffect(() => {
    if (!initial?.code) return;
    const t = setTimeout(() => void submit(initial.token, initial.code!, "QR"), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step.kind !== "scan" || initial?.code) return;
    let cancelled = false;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;

    // Loaded lazily so the scanner never lands in the main bundle.
    import("html5-qrcode")
      .then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
        if (cancelled) return;
        const s = new Html5Qrcode(ELEMENT_ID, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
        scanner = s;
        return s.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            const scan = parseScan(decoded);
            if (!scan) return setNotACode(true);
            stopScanner(s);
            void submit(scan.token, scan.code, "QR");
          },
          () => {},
        );
      })
      .catch(() => {
        if (!cancelled) setCameraError("Camera unavailable. Allow camera access, or type the code on the board.");
      });

    return () => {
      cancelled = true;
      if (scanner) stopScanner(scanner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  if (step.kind === "working") {
    return (
      <Center>
        <Loader2 className="size-10 text-muted-foreground motion-safe:animate-spin" />
        <p className="mt-4 font-medium">{step.label}</p>
        {needLocation && step.label.startsWith("Checking") && (
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Allow location if your phone asks. It is only used for this check.</p>
        )}
      </Center>
    );
  }

  if (step.kind === "done") {
    const o = step.outcome;
    if (o.ok) {
      const late = o.status === "LATE";
      return (
        <Center>
          <span className={`flex size-24 items-center justify-center rounded-full ${late ? "bg-warning-subtle text-warning-foreground dark:text-warning" : "bg-success-subtle text-success-strong"}`}>
            {late ? <Clock className="size-12" /> : <CircleCheck className="size-12" />}
          </span>
          <p className="mt-5 text-2xl font-bold">{o.already ? "Already marked" : late ? "Marked late" : "You're present"}</p>
          <p className="mt-1 text-muted-foreground">{o.subject}</p>
          {o.flagged && (
            <p className="mt-4 flex max-w-xs items-start gap-2 rounded-xl border border-warning/40 bg-warning-subtle px-3 py-2 text-left text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              Your teacher will review this mark: {o.flagged.toLowerCase()}.
            </p>
          )}
          <Button className="mt-8 h-12 w-full max-w-xs text-base" render={<Link href="/home" />}>
            Done
          </Button>
        </Center>
      );
    }
    return (
      <Center>
        <span className="flex size-24 items-center justify-center rounded-full bg-danger-subtle text-danger">
          <CircleX className="size-12" />
        </span>
        <p className="mt-5 text-2xl font-bold">Not marked</p>
        <p className="mt-2 max-w-xs text-muted-foreground">{o.message}</p>
        {o.reason !== "RATE_LIMITED" && o.reason !== "CLOSED" && (
          <div className="mt-8 grid w-full max-w-xs gap-2">
            <Button className="h-12 text-base" onClick={() => setStep({ kind: "scan" })}>
              <ScanLine className="size-4" /> Scan again
            </Button>
            <Button variant="outline" className="h-12 text-base" onClick={() => setStep({ kind: "type" })}>
              <Keyboard className="size-4" /> Type the code
            </Button>
          </div>
        )}
        <Button variant="ghost" className="mt-2 h-11" render={<Link href="/home" />}>
          Back to home
        </Button>
      </Center>
    );
  }

  if (step.kind === "type") {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-5 pt-6">
        <h1 className="text-xl font-semibold">Enter class code</h1>
        <p className="mt-1 text-sm text-muted-foreground">The 6 digits under the QR on your teacher&apos;s screen. They change every 20 seconds.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\D/g, "");
            if (code.length === 6) void submit(tokenRef.current, code, "CODE");
          }}
        >
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{3}\s?\d{3}"
            maxLength={7}
            required
            autoFocus
            placeholder="000 000"
            aria-label="Class code"
            className="h-16 text-center font-mono text-3xl tracking-[0.3em] md:text-3xl"
            onChange={(e) => {
              const digits = e.currentTarget.value.replace(/\D/g, "");
              if (digits.length === 6) e.currentTarget.form?.requestSubmit();
            }}
          />
          <Button type="submit" className="h-12 w-full text-base">
            Mark me present
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full" onClick={() => setStep({ kind: "scan" })}>
            Scan the QR instead
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col pt-6">
      <div className="px-5 text-center">
        <h1 className="text-xl font-semibold">Scan class QR</h1>
        <p className="mt-1 text-sm text-muted-foreground">{openHint ?? "Point your camera at the code on the board."}</p>
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-lg px-5">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-black/90">
          <div id={ELEMENT_ID} className="size-full [&_img]:hidden [&_video]:size-full [&_video]:object-cover" />
          <div aria-hidden className="pointer-events-none absolute inset-[14%]">
            {[
              "left-0 top-0 border-l-4 border-t-4 rounded-tl-xl",
              "right-0 top-0 border-r-4 border-t-4 rounded-tr-xl",
              "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-xl",
              "right-0 bottom-0 border-r-4 border-b-4 rounded-br-xl",
            ].map((c) => (
              <span key={c} className={`absolute size-10 border-primary ${c}`} />
            ))}
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
        {notACode && !cameraError && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            That QR isn&apos;t a class code. Aim at the teacher&apos;s screen.
          </p>
        )}
        <Button variant="outline" className="h-12 w-full text-base" onClick={() => setStep({ kind: "type" })}>
          <Keyboard className="size-4" /> Type the code instead
        </Button>
      </div>
    </div>
  );
}

/**
 * html5-qrcode's stop() throws synchronously (not a rejected promise) when
 * the camera never started, e.g. permission denied. Uncaught, that took the
 * page down exactly when a student switched to typing the code instead.
 */
function stopScanner(s: { stop: () => Promise<void>; clear: () => void }) {
  try {
    void s.stop().then(() => s.clear()).catch(() => {});
  } catch {
    // Never started: nothing to stop.
  }
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {children}
    </div>
  );
}
