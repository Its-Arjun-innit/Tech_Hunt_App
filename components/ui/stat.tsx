import { cn } from "cn";

/**
 * A single metric. Used across the admin dashboard and the player header, so
 * every number in the app shares one treatment.
 */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "brand";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-4 transition-colors hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <p
        className={cn(
          "mt-1.5 text-3xl font-semibold tabular-nums tracking-tight",
          tone === "brand" && "text-primary-strong",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-faint-foreground">{hint}</p>}
    </div>
  );
}
