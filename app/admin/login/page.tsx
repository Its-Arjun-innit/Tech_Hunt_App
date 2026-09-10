import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getAdmin } from "@/lib/auth/admin";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata = { title: "Admin sign in" };

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect(admin.role === "VOLUNTEER" ? "/volunteer" : "/admin");

  return (
    <main className="flex-1 flex flex-col justify-center px-5 py-10 max-w-sm w-full mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Organizer sign in</h1>
        <p className="text-muted-foreground mt-1 text-sm">Campus Treasure Hunt admin</p>
      </div>

      <AdminLoginForm />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Volunteer? <a href="/volunteer/login" className="underline underline-offset-4">Volunteer sign in</a>
      </p>
    </main>
  );
}
