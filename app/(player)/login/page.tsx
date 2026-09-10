import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getPlayer } from "@/lib/auth/player";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Campus Treasure Hunt" };

export default async function PlayerLoginPage() {
  if (await getPlayer()) redirect("/dashboard");

  return (
    <main className="flex-1 flex flex-col justify-center px-5 py-10 max-w-md w-full mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
          <MapPin className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Campus Treasure Hunt</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sign in with the details your organizer gave you.
        </p>
      </div>

      <LoginForm />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Organizer?{" "}
        <a href="/admin/login" className="underline underline-offset-4">
          Admin sign in
        </a>
      </p>
    </main>
  );
}
