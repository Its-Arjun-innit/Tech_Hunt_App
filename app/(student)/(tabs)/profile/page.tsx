import { LogOut } from "lucide-react";
import { requireStudent } from "@/lib/auth/student";
import { AppHeader } from "@/components/app-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { studentLogout } from "../../login/actions";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const student = await requireStudent();
  const rows = [
    ["Roll number", student.rollNo],
    ["Section", student.section.name],
    ["Department", student.section.department.name],
    ["Year · Semester", `${student.section.year} · ${student.section.semester}`],
  ];

  return (
    <>
      <AppHeader title={student.name} subtitle="Profile" name={student.name} profileHref="/profile" />
      <main className="mx-auto w-full max-w-lg space-y-6 px-5 py-5">
        <dl className="divide-y rounded-2xl border bg-surface">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Appearance</h2>
          <ThemeToggle />
        </section>

        <p className="text-sm text-muted-foreground">
          You can be signed in on one phone at a time. Signing in somewhere else signs this phone out.
        </p>

        <form action={studentLogout}>
          <Button type="submit" variant="outline" className="h-12 w-full text-base">
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </main>
    </>
  );
}
