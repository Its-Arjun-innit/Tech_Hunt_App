import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth/staff";

export default async function Root() {
  const staff = await getStaff();
  redirect(staff ? (staff.role === "ADMIN" ? "/admin" : "/teacher") : "/home");
}
