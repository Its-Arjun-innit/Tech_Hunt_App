import Link from "next/link";

/**
 * Compact title strip for the phone apps. The avatar opens the profile, so
 * sign-out and settings never need a tab of their own.
 */
export function AppHeader({
  title,
  subtitle,
  name,
  profileHref,
  children,
}: {
  title: string;
  subtitle?: string;
  name: string;
  profileHref: string;
  children?: React.ReactNode;
}) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="border-b border-border/50 bg-surface/80 pt-safe backdrop-blur-sm">
      <div className="mx-auto max-w-lg px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {subtitle && <p className="truncate text-xs font-medium text-faint-foreground">{subtitle}</p>}
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          </div>
          <Link
            href={profileHref}
            aria-label="Profile and settings"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold outline-none transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {initials}
          </Link>
        </div>
        {children}
      </div>
    </header>
  );
}
