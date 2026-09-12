"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendAnnouncement } from "@/app/admin/announcements/actions";

type Audience = "ALL_TEAMS" | "SELECTED_TEAMS" | "VOLUNTEERS" | "ADMINS";

const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  { value: "ALL_TEAMS", label: "All teams", hint: "Appears on every player dashboard" },
  { value: "SELECTED_TEAMS", label: "Selected teams", hint: "Only the teams you pick" },
  { value: "VOLUNTEERS", label: "Volunteers", hint: "Shown in the volunteer console" },
  { value: "ADMINS", label: "Admins", hint: "Organizers only" },
];

export function AnnouncementForm({ teams }: { teams: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("ALL_TEAMS");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduled, setScheduled] = useState("");

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = () =>
    startTransition(async () => {
      const result = await sendAnnouncement({
        message,
        audience,
        teamIds: [...selected],
        scheduledFor: scheduled || undefined,
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setMessage("");
        setSelected(new Set());
        setScheduled("");
        setAudience("ALL_TEAMS");
      }
      router.refresh();
    });

  const audienceLabel =
    audience === "SELECTED_TEAMS"
      ? `${selected.size} team${selected.size === 1 ? "" : "s"}`
      : AUDIENCES.find((a) => a.value === audience)!.label.toLowerCase();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="The hunt ends in 15 minutes. Head back to the quad when you finish."
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Audience</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <label
              key={a.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors hover:border-border-strong has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            >
              <input
                type="radio"
                name="audience"
                className="mt-0.5 size-4"
                checked={audience === a.value}
                onChange={() => setAudience(a.value)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{a.label}</span>
                <span className="block text-xs text-muted-foreground">{a.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {audience === "SELECTED_TEAMS" && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Teams{" "}
            <span className="font-normal text-muted-foreground">
              {selected.size === 0 ? "(none picked yet)" : `(${selected.size} picked)`}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                aria-pressed={selected.has(t.id)}
                className={`rounded-full border px-3 py-1 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  selected.has(t.id)
                    ? "border-primary bg-primary/10 font-medium"
                    : "hover:border-border-strong hover:bg-muted"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 max-w-xs">
        <Label htmlFor="scheduledFor" className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> Schedule (optional)
        </Label>
        <Input
          id="scheduledFor"
          type="datetime-local"
          value={scheduled}
          onChange={(e) => setScheduled(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to send now. Scheduled messages stay hidden until their time passes.
        </p>
      </div>

      {/* Preview: the brief asks for one, and it is the only way to catch a
          message aimed at the wrong audience before it lands. */}
      {message.trim() && (
        <div className="rounded-xl border border-dashed p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <div className="mt-3 rounded-lg border bg-surface p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Bell className="size-3.5" /> Announcement
            </p>
            <p className="mt-2 text-sm leading-snug">{message}</p>
            <p className="mt-1 text-xs text-faint-foreground">
              {scheduled ? new Date(scheduled).toLocaleString() : "just now"}
            </p>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Goes to {audienceLabel}
          </p>
        </div>
      )}

      <Button
        disabled={
          pending ||
          !message.trim() ||
          (audience === "SELECTED_TEAMS" && selected.size === 0)
        }
        onClick={submit}
      >
        <Send className="size-4" />
        {pending ? "Sending…" : scheduled ? "Schedule announcement" : "Send announcement"}
      </Button>
    </div>
  );
}
