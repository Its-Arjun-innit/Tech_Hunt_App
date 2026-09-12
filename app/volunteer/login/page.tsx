import { redirect } from "next/navigation";
import { HandHelping } from "lucide-react";
import { getAdmin } from "@/lib/auth/admin";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata = { title: "Volunteer sign in" };

export default async function VolunteerLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect(admin.role === "VOLUNTEER" ? "/volunteer" : "/admin");

  return (
    <main className="relative flex flex-1 flex-col justify-center overflow-hidden px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <HandHelping className="size-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Volunteer</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to verify teams at your checkpoint.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border bg-surface p-5 shadow-sm">
          <AdminLoginForm label="Start volunteering" />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          An organizer gives you these details.
        </p>
      </div>
    </main>
  );
}
