import { CircleCheck, CircleSlash, Clock, ShieldCheck } from "lucide-react";
import { cn } from "cn";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success-subtle text-success-strong border-success/30",
  warning: "bg-warning-subtle text-warning-foreground border-warning/40 dark:text-warning",
  danger: "bg-danger-subtle text-danger border-danger/30",
  info: "bg-info-subtle text-info border-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
  brand: "bg-primary/15 text-primary-foreground border-primary/40 dark:text-primary-strong",
};

/** General status pill. Always carries a word; colour is never the only signal. */
export function StatusPill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" />}
      {children}
    </span>
  );
}

const ATTENDANCE = {
  PRESENT: { tone: "success", icon: CircleCheck, label: "Present" },
  LATE: { tone: "warning", icon: Clock, label: "Late" },
  ABSENT: { tone: "danger", icon: CircleSlash, label: "Absent" },
  EXCUSED: { tone: "info", icon: ShieldCheck, label: "Excused" },
} as const;

/** The one way an attendance status is rendered: word, glyph and colour. */
export function AttendancePill({ status }: { status: keyof typeof ATTENDANCE }) {
  const a = ATTENDANCE[status];
  return (
    <StatusPill tone={a.tone} icon={a.icon}>
      {a.label}
    </StatusPill>
  );
}
