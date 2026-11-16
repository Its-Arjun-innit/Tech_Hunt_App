# Decisions

Why the app is shaped the way it is. Each entry is a choice a reasonable person
might otherwise undo.

---

### The rotating code is the guard; location is a second layer

Attendance codes are `HMAC(session secret, 20-second window)`, like an
authenticator app (`lib/attendance/code.ts`). A code is valid in its own window
and the next, so it lives at most 40 seconds. A photo of the projector forwarded
to someone in the hostel is dead before they open the app.

Location is checked too, but browser GPS can be faked and is often 30–80 m off
indoors. So by default a mark outside the room radius is **accepted and
flagged** for the teacher rather than refused. Refusing honest students because
the canteen's Wi-Fi geolocates them wrongly costs more trust than it saves.
`Settings.geoMode` can switch to REJECT or OFF.

One device per student (creating a session deletes the others) makes proxying a
friend noisy: they get signed out of their own phone.

---

### Nothing runs on a timer

Sessions close when `now > closesAt`. Marks after `lateAt` are LATE. Scheduled
notices appear when `scheduledFor` passes. Codes rotate because time moves. All
of these are comparisons made when the data is read.

No mark means absent: no job writes ABSENT rows when a session closes. The
ABSENT status exists only for a teacher's explicit override.

This keeps the whole app a single Next.js project on Vercel with no scheduler. It
is the same choice the treasure hunt made for its reservations, and it held up.

---

### Exactly-once marking comes from a unique constraint

`AttendanceRecord` has `@@unique([sessionId, studentId])`. Two taps, or the same
code typed on two phones at once, both reach the insert; the loser gets "already
marked". No read-then-write race to get wrong. `scripts/attendance-concurrency-check.ts`
proves it against a real database.

---

### The timetable is a weekly plan plus one-day exceptions

`TimetableSlot` is the recurring week. `SlotException` changes one slot on one
date: cancelled, new time, new room, substitute. `classesOn()` in
`lib/timetable/resolve.ts` is a pure function that merges the two and drops
holidays, and `classesBetween()` in `load.ts` is the only query that feeds it.

Every screen that asks "what is on now" (student home, timetable, teacher Today,
"start attendance") goes through that pair. Re-deriving it per page is how the
hunt once told a team mid-game it had finished.

---

### Course is the hub

`Course` = subject × section × teacher. Slots, sessions and reports hang off it,
so changing who teaches a subject is one row, and assignments or marks can be
added later without touching attendance.

---

### Campus time, not server time

Servers run in UTC. `lib/time.ts` turns an instant into the campus date, weekday
and minute-of-day using `CAMPUS_TZ`. Timetable minutes are campus-local. Without
this, an Indian college's 9:00 class shows up at 2:30 in the afternoon.

---

### Attendance percentages are integer maths

`lib/attendance/stats.ts` computes "can miss N more" and "attend the next N" in
whole numbers and rounds the percentage down, so 74.9% never displays as 75%
while the student is actually short.

---

### Students and staff are separate tables with separate cookies

A student is not staff. Different table, cookie, route tree and sign-in.
Teachers, HODs and admins share `Staff` with a role, because that is a
permission difference, not a different kind of person.

---

### Prisma 6, bcryptjs

Unchanged from the hunt: Prisma 8's CLI is a different tool, and bcryptjs needs
no native binary on Vercel.
