"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { playerLogin, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-12 text-base" disabled={pending}>
      <LogIn className="size-4" />
      {pending ? "Signing in…" : "Start hunting"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(playerLogin, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="teamName">Team name</Label>
        <Input
          id="teamName"
          name="teamName"
          required
          autoComplete="organization"
          autoCapitalize="words"
          placeholder="Team Alpha"
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="memberCode">Member code</Label>
        <Input
          id="memberCode"
          name="memberCode"
          required
          autoComplete="username"
          autoCapitalize="characters"
          placeholder="A001"
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
          className="h-12 text-base tracking-[0.4em] text-center"
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

      <SubmitButton />
    </form>
  );
}
