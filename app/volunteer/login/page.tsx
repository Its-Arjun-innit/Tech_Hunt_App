import { redirect } from "next/navigation";
import { HandHelping } from "lucide-react";
import { getAdmin } from "@/lib/auth/admin";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata = { title: "Volunteer sign in" };

export default async function VolunteerLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect(admin.role === "VOLUNTEER" ? "/volunteer" : "/admin");

  return (
    <main className="flex-1 flex flex-col justify-center px-5 py-10 max-w-sm w-full mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
          <HandHelping className="size-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Volunteer sign in</h1>
        <p className="text-muted-foreground mt-1 text-sm">Verify challenges at your checkpoint</p>
      </div>

      <AdminLoginForm label="Start volunteering" />
    </main>
  );
}
