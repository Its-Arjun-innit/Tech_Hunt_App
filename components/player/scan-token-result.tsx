"use client";

import { useRouter } from "next/navigation";
import type { ScanOutcome } from "@/lib/game-engine/process-scan";
import { ScanResultView } from "./scan-result";

/** Wraps the shared result view for the direct-link scan route. */
export function ScanTokenResult({ outcome }: { outcome: ScanOutcome }) {
  const router = useRouter();
  return (
    <main className="flex-1 flex flex-col py-6">
      <ScanResultView outcome={outcome} onScanAgain={() => router.push("/scan")} />
    </main>
  );
}
