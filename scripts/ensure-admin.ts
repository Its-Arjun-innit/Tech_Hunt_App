/**
 * Creates the first super admin if the database has none.
 *
 * Runs during the Vercel build, after migrations, so a fresh deployment has a
 * usable organizer login without anyone having to seed by hand. It is
 * idempotent and never overwrites an existing account, so redeploys leave a
 * changed password alone.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("[ensure-admin] ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping.");
    return;
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`[ensure-admin] ${email} already exists, leaving it untouched.`);
    return;
  }

  const anySuperAdmin = await prisma.adminUser.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { email: true },
  });
  if (anySuperAdmin) {
    console.log(
      `[ensure-admin] a super admin already exists (${anySuperAdmin.email}), skipping.`,
    );
    return;
  }

  await prisma.adminUser.create({
    data: {
      email,
      name: "Super Admin",
      passwordHash: await bcrypt.hash(password, 10),
      role: "SUPER_ADMIN",
    },
  });
  console.log(`[ensure-admin] created super admin ${email}.`);
}

main()
  .catch((e) => {
    // A build must not ship if the database is unreachable, because every
    // page that queries would fail at runtime anyway.
    console.error("[ensure-admin] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
