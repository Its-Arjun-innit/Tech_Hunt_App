import { LogOut } from "lucide-react";
import { requireStaff } from "@/lib/auth/staff";
import { AppHeader } from "@/components/app-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { staffLogout } from "@/app/staff/login/actions";

export const metadata = { title: "Profile" };

export default async function TeacherProfile() {
  const staff = await requireStaff();
  return (
    <>
      <AppHeader title={staff.name} subtitle={staff.role.toLowerCase()} name={staff.name} profileHref="/teacher/profile" />
      <main className="mx-auto w-full max-w-lg space-y-6 px-5 py-5">
        <p className="text-sm text-muted-foreground">{staff.email}</p>
        <section>
          <h2 className="mb-2 text-sm font-semibold">Appearance</h2>
          <ThemeToggle />
        </section>
        <form action={staffLogout}>
          <Button type="submit" variant="outline" className="h-12 w-full text-base">
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </main>
    </>
  );
}
