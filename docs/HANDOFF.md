# Handoff — Campus

Last updated 16 November 2026.

Related: [DECISIONS.md](DECISIONS.md) for the architecture choices.
[WEEKLY-REPORT.md](WEEKLY-REPORT.md) covers the treasure-hunt build this repo
started as.

---

## Where things stand

The repo was pivoted from a campus treasure hunt to a campus helper app on the
`campus-pivot` branch. The hunt code is gone from the tree; git history keeps it.

Built:

- **Students**: home (now / next class, mark button while attendance is open,
  attendance ring, unread notices), week-strip timetable, scan-or-type marking
  with location, per-subject attendance and history, notices with unread badge,
  profile with theme toggle.
- **Teachers**: Today with one-tap start, live session screen (rotating QR,
  roster, P/L/A/E overrides, extend, close), class reports with defaulters and
  CSV register, cancel / move / re-room / substitute a class (auto-notifies the
  section), notices with seen counts.
- **Admin**: departments, sections, subjects, rooms (with "use my location"),
  staff and student CSV import with one-time PIN / password sheets, courses,
  timetable builder with clash checks, holidays, attendance reports, notices,
  settings, audit log.
- **Platform**: installable manifest, dark mode toggle, campus time zone.

Not built yet (the plan's "Later" list): push notifications, offline timetable,
file upload for notice attachments (it's a link field for now), leave / medical
requests, assignments, marks, events, and everything under "Campus life".

---

## Start here

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Local DB: PostgreSQL on `localhost:5432`, database `treasurehunt`, user and
password `postgres`. The seed prints the logins (admin, five teachers, 40
students, all with demo passwords).

---

## Before deploying the branch

The migration `20261116120000_campus_pivot` **drops every treasure-hunt table**
and creates the new schema. The Vercel build runs migrations automatically, so
merging to `main` wipes whatever is in the production Supabase database. That was
demo event data at the time of the pivot; check before merging if that has
changed.

After deploy, the first admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
as before. Set `CAMPUS_TZ` if the college is not in India.

---

## Where things live

```
app/
  (student)/            login, a/[token] (camera deep link), (tabs)/home,
                        timetable, mark, attendance, notices, profile
  teacher/              (tabs)/ today, classes, notices, profile; session/[id]
  staff/login/          one sign-in for every staff role
  admin/                the office console
lib/
  attendance/           code (rotating HMAC), geo, stats, mark, queries
  timetable/            resolve (pure), load (the one query)
  auth/                 student, staff, session cookies, audit log
  time.ts               campus clock
  notices.ts            who sees what, who may post where
```

---

## Verifying a change

```bash
npm test
npx tsc --noEmit
npm run build
npx tsx scripts/attendance-concurrency-check.ts
```

Camera and geolocation only work over HTTPS on a real phone. Check marking on a
Vercel preview URL with an actual device; the desktop preview cannot prove it.
