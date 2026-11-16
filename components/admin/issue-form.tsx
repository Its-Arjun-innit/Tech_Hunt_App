"use client";

import { useActionState, useEffect } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/action-form";
import type { IssueResult } from "@/app/admin/actions";

/**
 * A form whose action hands back secrets (PINs or passwords) exactly once.
 * They show in a printable table right here and are gone on refresh; only
 * the hashes are stored.
 */
export function IssueForm({
  action,
  children,
  submitLabel,
  className,
  secretLabel = "PIN",
}: {
  action: (prev: IssueResult, fd: FormData) => Promise<IssueResult>;
  children?: React.ReactNode;
  submitLabel: string;
  className?: string;
  secretLabel?: string;
}) {
  const [state, formAction] = useActionState<IssueResult, FormData>(action, {});

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-3">
      <form action={formAction} className={className}>
        {children}
        <SubmitButton variant={children ? "default" : "outline"} size="sm">
          {submitLabel}
        </SubmitButton>
      </form>

      {state.error && state.ok && <p className="text-sm text-danger">{state.error}</p>}

      {!!state.issued?.length && (
        <div className="rounded-lg border bg-surface print:border-0">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2 print:hidden">
            <p className="text-sm font-medium text-warning-foreground dark:text-warning">Shown once — print or hand out now.</p>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5">Name</th>
                <th className="px-3 py-1.5">Sign in with</th>
                <th className="px-3 py-1.5">{secretLabel}</th>
              </tr>
            </thead>
            <tbody>
              {state.issued.map((r) => (
                <tr key={r.login} className="border-t">
                  <td className="px-3 py-1.5">{r.who}</td>
                  <td className="px-3 py-1.5 font-mono">{r.login}</td>
                  <td className="px-3 py-1.5 font-mono font-semibold">{r.secret}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
