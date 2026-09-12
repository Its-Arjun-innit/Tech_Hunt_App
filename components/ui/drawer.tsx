"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/**
 * Side sheet for admin detail views: a team's full history, a checkpoint's
 * live state. Built on the same Base UI dialog as the modal so focus
 * trapping and Escape come for free.
 *
 * Animations are left off deliberately: Base UI keeps a popup mounted until
 * its exit animation ends, and a drawer stuck open over the console during a
 * live game is a worse outcome than a missing slide transition.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg";
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]"
          style={{ animation: "none" }}
        />
        <DialogPrimitive.Popup
          data-slot="drawer"
          style={{ animation: "none" }}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-surface shadow-2xl outline-none",
            width === "md" ? "sm:max-w-md" : "sm:max-w-xl",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold truncate">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && <div className="border-t px-5 py-3">{footer}</div>}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
