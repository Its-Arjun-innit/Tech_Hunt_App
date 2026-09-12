import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { getPlayer } from "@/lib/auth/player";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Campus Hunt" };

export default async function PlayerLoginPage() {
  if (await getPlayer()) redirect("/dashboard");

  return (
    <main className="relative flex flex-1 flex-col justify-center overflow-hidden px-5 py-10">
      {/* Two quiet lime washes so the entry screen feels like a game opening
          rather than a corporate form, without resorting to a gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 size-72 rounded-full bg-accent blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Compass className="size-7" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Campus Hunt</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your team credentials to continue.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border bg-surface p-5 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need help? Find an organizer.
        </p>
        <p className="mt-2 text-center text-xs">
          <a
            href="/admin/login"
            className="rounded text-faint-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Organizer sign in
          </a>
        </p>
      </div>
    </main>
  );
}
