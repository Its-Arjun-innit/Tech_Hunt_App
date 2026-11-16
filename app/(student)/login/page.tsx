import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getStudent } from "@/lib/auth/student";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function StudentLoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? next : undefined;
  if (await getStudent()) redirect(target?.startsWith("/") ? target : "/home");

  return (
    <main className="relative flex flex-1 flex-col justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-20 size-72 rounded-full bg-accent blur-3xl" />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="size-7" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Campus</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {target?.startsWith("/a/") ? "Sign in to mark your attendance." : "Classes, attendance and notices in one place."}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border bg-surface p-5 shadow-sm">
          <LoginForm next={target} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Forgot your PIN? The college office can reset it.
        </p>
        <p className="mt-2 text-center text-xs">
          <a
            href="/staff/login"
            className="rounded text-faint-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Staff sign in
          </a>
        </p>
      </div>
    </main>
  );
}
