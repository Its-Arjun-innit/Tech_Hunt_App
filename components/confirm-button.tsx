"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * A button that asks before doing something destructive.
 *
 * Replaces window.confirm so the question can name the actual consequence
 * ("Teams heading here lose their destination") rather than a generic prompt,
 * and so the dialog is styled, focus-trapped and dismissable with Escape.
 *
 * The dialog closes as soon as the action starts, since every caller reports
 * the result with a toast and refreshes the page.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
  disabled,
  children,
  ...triggerProps
}: Omit<ButtonProps, "onClick"> & {
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button {...triggerProps} disabled={disabled} />}
      >
        {children}
      </DialogTrigger>

      {/* Base UI keeps the popup mounted until its exit animation ends, so
          anywhere animations do not run the dialog would stay on screen after
          Cancel. A confirm dialog is not worth that risk, so it opens and
          closes instantly. Inline style beats any utility-class ordering. */}
      <DialogContent style={{ animation: "none" }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{cancelLabel}</DialogClose>
          <Button
            variant={confirmVariant}
            disabled={running}
            onClick={async () => {
              setRunning(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setRunning(false);
              }
            }}
          >
            {running && <Loader2 className="size-4 motion-safe:animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
