"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studentLogin, type LoginState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={pending}>
      <LogIn className="size-4" />
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(studentLogin, {});

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-2">
        <Label htmlFor="rollNo">Roll number</Label>
        <Input
          id="rollNo"
          name="rollNo"
          required
          autoComplete="username"
          autoCapitalize="characters"
          placeholder="23CSA001"
          className="h-12 text-base uppercase"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin">6-digit PIN</Label>
        <Input
          id="pin"
          name="pin"
          required
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="current-password"
          placeholder="••••••"
          className="h-12 text-center text-base tracking-[0.4em]"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}
