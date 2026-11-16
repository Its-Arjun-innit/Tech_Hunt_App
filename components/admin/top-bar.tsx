import Link from "next/link";
import { Radio, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-badge";
import { staffLogout } from "@/app/staff/login/actions";

/** Always-visible campus state: how many classes are taking attendance right now. */
export function AdminTopBar({ email, openSessions }: { email: string; openSessions: number }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-6 print:hidden">
      {openSessions > 0 ? (
        <StatusPill tone="success" icon={Radio}>
          {openSessions} class{openSessions === 1 ? "" : "es"} marking now
        </StatusPill>
      ) : (
        <StatusPill tone="neutral">No attendance open</StatusPill>
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground xl:block">{email}</span>
        <Button variant="ghost" size="sm" render={<Link href="/teacher" />}>
          <Smartphone className="size-3.5" /> Teacher app
        </Button>
        <form action={staffLogout}>
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
