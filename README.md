# Campus

One app for a college: the weekly timetable, attendance marked by scanning a
rotating QR (or typing its code) with a location check, and notices from the
teacher's desk. Phone-first for students and teachers; a desktop console for the
college office.

Single Next.js project on Vercel with Supabase PostgreSQL. No separate backend,
no cron jobs, no websocket server.

Picking this up fresh? Read [docs/HANDOFF.md](docs/HANDOFF.md) for where things
stand and [docs/DECISIONS.md](docs/DECISIONS.md) for why it looks the way it does.

---

## The attendance loop

```
Teacher taps "Start attendance" → QR + 6-digit code on their screen, new every 20 s
Student scans (or types the code) → phone shares location → server checks
  code valid? session open? student in this section? inside the room radius?
→ PRESENT / LATE (after the late cut-off), or flagged for the teacher if outside the room
Session closes on its own timer. No mark = absent.
```

---

## Three apps

| Who | Where | What |
| --- | --- | --- |
| Students | `/login` → `/home` | Now/next class, timetable, mark attendance, per-subject percentages with "you can miss N more", notices |
| Teachers, HODs | `/staff/login` → `/teacher` | Today's classes with one-tap start, live roster with overrides, class reports and CSV register, cancel/move/substitute a class, post notices with seen counts |
| College office | `/staff/login` → `/admin` | Departments, sections, subjects, rooms, staff, students (CSV import, PIN sheets), courses, timetable builder with clash checks, holidays, reports, settings, audit log |

---

## Quick start

Requires Node 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env
npx prisma migrate deploy && npm run db:seed && npm run dev
```

The seed builds a demo college and prints the logins:

| Role | Sign in at | Credentials |
| --- | --- | --- |
| Admin | `/staff/login` | `admin@campus.edu` / `admin1234` |
| Teacher (HOD) | `/staff/login` | `anita@campus.edu` / `teach1234` |
| Student | `/login` | `23CSA001` / `123456` |

The seed wipes every table and refuses to run against a non-local database.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled connection (Supabase port 6543). `POSTGRES_PRISMA_URL` from Vercel integrations is mapped automatically. |
| `DIRECT_URL` | yes | Direct connection for migrations. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first deploy | The first admin, created during the build if no admin exists. |
| `CAMPUS_TZ` | no | IANA time zone of the college. Default `Asia/Kolkata`. |
| `APP_URL` | no | Public origin for the QR link. Derived automatically on Vercel. |

---

## Checks

```bash
npm test                                         # unit tests, no database
npx tsc --noEmit
npm run build
npx tsx scripts/attendance-concurrency-check.ts  # needs the seeded local DB
```
