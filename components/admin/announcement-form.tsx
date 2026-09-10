"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendAnnouncement } from "@/app/admin/announcements/actions";

export function AnnouncementForm({ teams }: { teams: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="The hunt ends in 15 minutes. Head back to the quad when you finish."
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Recipients{" "}
          <span className="font-normal text-muted-foreground">
            {selected.size === 0 ? "(all teams)" : `(${selected.size} selected)`}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selected.has(t.id) ? "border-primary bg-primary/10" : "hover:bg-muted"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <Button
        disabled={pending || !message.trim()}
        onClick={() =>
          startTransition(async () => {
            const result = await sendAnnouncement(message, [...selected]);
            toast[result.ok ? "success" : "error"](result.message);
            if (result.ok) {
              setMessage("");
              setSelected(new Set());
            }
            router.refresh();
          })
        }
      >
        <Send className="size-4" />
        {pending ? "Sending…" : "Send announcement"}
      </Button>
    </div>
  );
}
