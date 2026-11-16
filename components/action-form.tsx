"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ActionResult = { ok?: string; error?: string };
type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * A plain form wired to a server action that returns { ok } or { error }.
 * The result shows as a toast and, for errors, inline beside the button, so
 * every admin and teacher form reports back the same way without its own
 * client component. The form resets after success.
 */
export function ActionForm({
  action,
  children,
  className,
  reset = true,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  reset?: boolean;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      if (reset) ref.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, reset]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="basis-full text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  className,
  variant,
  size,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size}>
      {pending && <Loader2 className="size-4 motion-safe:animate-spin" />}
      {children}
    </Button>
  );
}
