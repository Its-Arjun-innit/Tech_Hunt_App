"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StatusPill } from "@/components/status-badge";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteAnnouncement } from "@/app/admin/announcements/actions";

type Item = {
  id: string;
  message: string;
  audience: string;
  teams: string[];
  createdAt: string;
  scheduledFor: string | null;
};

export function AnnouncementList({ announcements }: { announcements: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <ul className="space-y-2">
      {announcements.map((a) => {
        const pendingSend = a.scheduledFor && new Date(a.scheduledFor) > new Date();
        return (
          <li key={a.id} className="rounded-xl border bg-surface px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm leading-snug">{a.message}</p>
              <ConfirmButton
                size="sm"
                variant="ghost"
                disabled={pending}
                aria-label="Delete announcement"
                title="Delete this announcement?"
                description="It disappears from every dashboard that is showing it. This cannot be undone."
                confirmLabel="Delete"
                onConfirm={() =>
                  new Promise<void>((resolve) =>
                    startTransition(async () => {
                      const result = await deleteAnnouncement(a.id);
                      toast[result.ok ? "success" : "error"](result.message);
                      router.refresh();
                      resolve();
                    }),
                  )
                }
              >
                <Trash2 className="size-3.5" />
              </ConfirmButton>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill tone="neutral">{a.audience}</StatusPill>
              {a.teams.length > 0 && (
                <span className="text-xs text-muted-foreground">{a.teams.join(", ")}</span>
              )}
              {pendingSend ? (
                <StatusPill tone="warning" icon={Clock}>
                  scheduled {new Date(a.scheduledFor!).toLocaleString()}
                </StatusPill>
              ) : (
                <span className="text-xs text-faint-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
