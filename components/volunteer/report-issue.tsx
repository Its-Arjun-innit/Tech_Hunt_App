"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportIssue } from "@/app/volunteer/actions";

export function ReportIssue() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="The QR poster at the library is damaged."
      />
      <Button
        className="w-full h-11"
        disabled={pending || !message.trim()}
        onClick={() =>
          startTransition(async () => {
            const result = await reportIssue(message);
            toast[result.ok ? "success" : "error"](result.message);
            if (result.ok) setMessage("");
            router.refresh();
          })
        }
      >
        <Flag className="size-4" />
        {pending ? "Reporting…" : "Report issue"}
      </Button>
    </div>
  );
}
