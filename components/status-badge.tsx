import { AlertTriangle, ArrowRight, CircleCheck, PowerOff } from "lucide-react";
import { cn } from "cn";
import {
  TRAFFIC_CLASS,
  TRAFFIC_ICON,
  TRAFFIC_LABEL,
  type TrafficState,
} from "@/lib/routing/traffic";

const ICONS = {
  check: CircleCheck,
  arrow: ArrowRight,
  alert: AlertTriangle,
  off: PowerOff,
} as const;

/**
 * The single way a traffic state is rendered anywhere in the app.
 *
 * Always ships the glyph and the word alongside the colour, because the brand
 * lime and the success emerald are close enough that colour alone would be a
 * weak signal. `compact` drops the word for tight rows but keeps the icon and
 * an accessible label.
 */
export function TrafficBadge({
  state,
  compact = false,
  className,
}: {
  state: TrafficState;
  compact?: boolean;
  className?: string;
}) {
  const Icon = ICONS[TRAFFIC_ICON[state]];
  const label = TRAFFIC_LABEL[state];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        TRAFFIC_CLASS[state],
        className,
      )}
      title={compact ? label : undefined}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {compact ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success-subtle text-success-strong border-success/30",
  warning: "bg-warning-subtle text-warning-foreground border-warning/40 dark:text-warning",
  danger: "bg-danger-subtle text-danger border-danger/30",
  info: "bg-info-subtle text-info border-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
  brand: "bg-primary/15 text-primary-foreground border-primary/40 dark:text-primary-strong",
};

/** General status pill for game state, team state, attempt state and so on. */
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

/** Maps a game status to a tone so every surface agrees on the colour. */
export function gameStatusTone(status: string): Tone {
  if (status === "ACTIVE") return "success";
  if (status === "PAUSED") return "warning";
  if (status === "ENDED") return "neutral";
  return "info";
}
