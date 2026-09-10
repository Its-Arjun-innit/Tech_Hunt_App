"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin, type AdminLoginState } from "@/app/admin/login/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      <LogIn className="size-4" />
      {pending ? "Signing in…" : label}
    </Button>
  );
}

export function AdminLoginForm({ label = "Sign in" }: { label?: string }) {
  const [state, action] = useActionState<AdminLoginState, FormData>(adminLogin, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11"
          placeholder="admin@campus.edu"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <SubmitButton label={label} />
    </form>
  );
}
