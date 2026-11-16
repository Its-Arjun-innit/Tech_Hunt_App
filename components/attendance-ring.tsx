import { cn } from "cn";

/**
 * Percentage ring. The number sits inside in text, and the colour follows
 * the standing (success / warning / danger), never the brand lime, which is
 * not a status.
 */
export function AttendanceRing({
  pct,
  below,
  size = 72,
  className,
}: {
  pct: number | null;
  below: boolean;
  size?: number;
  className?: string;
}) {
  const stroke = size / 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = pct ?? 0;
  const tone = pct === null ? "text-muted-foreground" : below ? "text-danger" : value < 85 ? "text-warning" : "text-success";

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className={cn("stroke-current transition-[stroke-dashoffset] duration-700", tone)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
        {pct === null ? "—" : `${pct}%`}
      </span>
    </div>
  );
}
