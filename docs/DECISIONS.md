# Decisions

Why the app is shaped the way it is. Each entry is a choice that a reasonable
person might otherwise undo.

---

### The score ledger is the source of truth, not `Team.score`

Every point movement is a `ScoreEvent` row. `Team.score` is a cached sum updated
in the same transaction.

This is why the delayed leaderboard works: it sums events older than a cutoff
rather than trusting the cached number. It is also why a manual adjustment shows
up in a team's own activity feed without extra plumbing, and why disputes can be
settled by reading rows.

Do not "simplify" this by editing `Team.score` directly.

---

### Reservations expire by comparison, never by a job

An `ACTIVE`, unexpired `RoutingAssignment` *is* the soft reservation. Expiry is a
timestamp comparison performed wherever the data is read.

The alternative, a scheduled sweep marking rows expired, would mean a cron job,
which on Vercel means either a paid scheduler or a separate always-on process.
The whole architecture stays a single Next.js project because of this choice.
Scheduled announcements use the same trick.

---

### Concurrency is handled in the database, not in application code

`processScan` opens with `SELECT … FOR UPDATE` on the team row, and a partial
unique index enforces one successful scan per team per checkpoint.

Two members of a team will scan the same poster at the same moment. That is
normal behaviour, not an edge case. Application-level guards lose that race;
the row lock does not. `scripts/concurrency-check.ts` runs both calls in
parallel and asserts exactly one score event.

---

### Challenge config stays JSON, validated by zod

`Challenge.config` is a JSON column with a zod schema per challenge type in
`lib/challenges/schemas.ts`. The admin has a typed form, but it builds that same
JSON and the server re-validates it.

Typed columns per challenge type would mean a migration for every new type. The
JSON-plus-schema pairing lets a new challenge type be a schema, a grader branch
and a form branch, with no database change.

---

### Volunteers are admin users with a role, not a separate table

`AdminUser.role` distinguishes `SUPER_ADMIN`, `GAME_ADMIN` and `VOLUNTEER`. They
share a session table and `requireAdmin(minRole)` gates every admin route.

A separate volunteer table would duplicate auth, sessions and password resets for
what is a permission difference. Volunteers can only reach `/volunteer`; the role
check redirects them away from admin routes.

Players are genuinely separate: different table, different cookie, different
route tree, because a player is not staff.

---

### Prisma 6, not 8

Prisma 8's CLI is a different, platform-oriented tool with a command set this
project does not use. Prisma 6 is pinned deliberately. Upgrading means revisiting
`scripts/migrate-deploy.mjs` and the build command.

---

### bcrypt, not argon2

Argon2 needs a native binary. bcryptjs is pure JavaScript and works on Vercel's
runtime without a build step. For six-digit PINs guarded by rate limiting and
one-session-per-player, bcrypt is the right trade.

---

### The player UI hides the engine

The backend is genuinely complex: weighted routing, soft reservations, capacity
modelling, congestion. A player sees a clue and a scan button.

When adding to the player side, ask whether it answers "what do I do now" or
"where do I go". If it answers neither, it belongs on the team tab, the activity
tab, or the admin console.
