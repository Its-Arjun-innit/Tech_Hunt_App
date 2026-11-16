import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getStaff } from "@/lib/auth/staff";
import { StaffLoginForm } from "@/components/staff-login-form";

export const metadata = { title: "Staff sign in" };

export default async function StaffLoginPage() {
  const staff = await getStaff();
  if (staff) redirect(staff.role === "ADMIN" ? "/admin" : "/teacher");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen className="size-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Staff sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Teachers, HODs and the college office</p>
      </div>

      <StaffLoginForm />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Student? <a href="/login" className="underline underline-offset-4">Sign in with your roll number</a>
      </p>
    </main>
  );
}
