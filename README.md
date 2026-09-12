# Campus Treasure Hunt

A campus-wide QR treasure hunt. Teams scan physical checkpoints, earn points, solve
challenges and are routed dynamically so they spread out instead of queueing at the
same place.

Single Next.js project. Deploys to Vercel with Supabase PostgreSQL. No separate
backend, no Redis, no websocket server.

---

## The game loop

```
SCAN QR → validate → award points → run routing engine
       → reserve destination → return clue → team walks → repeat
```

The routing engine never sends every team the same way. Two teams finishing the same
checkpoint seconds apart get different destinations, because the first team's
assignment immediately reserves its target and pushes the second team elsewhere.

---

## Quick start

Requires Node 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env
```

Fill in `DATABASE_URL` and `DIRECT_URL`, then:

```bash
npx prisma migrate deploy && npm run db:seed && npm run dev
```

The seed prints every login and checkpoint URL. Defaults:

| Role | Sign in at | Credentials |
| --- | --- | --- |
| Organizer | `/admin/login` | `admin@campus.edu` / `admin1234` |
| Volunteer | `/volunteer/login` | `volunteer@campus.edu` / `volunteer1234` |
| Player | `/login` | team name + member code + 6-digit PIN from the seed output |

Change `ADMIN_PASSWORD` in `.env` before deploying anywhere real.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled connection. On Supabase use the port 6543 pgBouncer string. Vercel's Supabase and Neon integrations supply this as `POSTGRES_PRISMA_URL`, which is accepted automatically. |
| `DIRECT_URL` | no | Direct connection on port 5432, used for migrations. Falls back to `DATABASE_URL`. |
| `APP_URL` | no | Public origin encoded into every checkpoint QR code. Derived automatically on Vercel; set it elsewhere. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed only | Seeds the first super admin. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | no | Browser key. Without it the admin map falls back to a coordinate grid. |
| `GOOGLE_MAPS_API_KEY` | no | Server key, only needed if you add geocoding. |
| `SUPABASE_*` | no | Only needed if you add Realtime or Storage later. |

Never commit `.env`. `.env.example` is the template that is committed.

---

## Deploying

**Supabase.** Create a project, then copy both connection strings from Database
settings. Use the pooled string for `DATABASE_URL` and the direct one for
`DIRECT_URL`.

**Vercel.** Import the GitHub repository, set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and
deploy. Attaching Postgres from the Storage tab is enough to supply the connection,
with no prefix. The build applies every pending migration and creates the first super
admin from those two variables, so a fresh deployment is ready to sign in to. Both
steps are idempotent and safe on every redeploy.

Do not use Prisma Postgres. It issues a `prisma+postgres://` URL that requires the
Accelerate extension this app does not use; the build refuses it with an explanation.

**Google Maps.** Enable the Maps JavaScript API and Places API. Restrict the browser
key by HTTP referrer to your Vercel domain. The application works without a key.

---

## Setting up a hunt

1. Create a game under **Game controls**.
2. Add teams by hand, or import a roster CSV of `team name, member name, member code`.
   PINs are generated and shown once. Print them from **Credentials**.
3. Create checkpoints. Set the location on the map, the points, the capacity and the
   difficulty.
4. On each checkpoint, tick its **possible next checkpoints**. The engine picks one of
   those per team based on live conditions.
5. Write **clues** for each checkpoint, cryptic first, clearest last. Clues describe how
   to reach that checkpoint, so a team receives the clue for wherever it was sent.
6. Optionally add a **challenge**. A team must finish it before receiving its next clue.
7. Print the **QR posters** and tape one at each checkpoint.
8. Press **Start game**.

---

## How routing works

`lib/routing/engine.ts` scores every candidate checkpoint:

```
score =  distance fit + progression + difficulty fit + route match
       − teams present − teams approaching − capacity risk − recent visits
```

Every weight lives in `lib/routing/config.ts` and can be overridden per game from the
admin UI, so tuning the game never means editing the engine.

An assignment doubles as the soft reservation. While it is `ACTIVE` and unexpired the
target counts as *approaching*, which is what stops a stampede. Reservations expire by
timestamp comparison at read time, so nothing needs a cron job or a background worker,
which keeps the whole thing serverless-friendly.

Checkpoint traffic is derived, never stored:

| State | Meaning |
| --- | --- |
| GREEN | Available |
| YELLOW | One or more teams approaching |
| RED | Occupancy plus approaching has reached capacity |
| GRAY | Disabled |

---

## Security model

- PINs and admin passwords are bcrypt hashed. PINs cannot be read back, only reset.
- Sessions are HTTP-only cookies backed by database rows. Signing in deletes any prior
  session for that player, which gives one active device per player and makes admin
  force-logout a single delete.
- Players and admins use entirely separate cookies, tables and route trees.
- Team identity always comes from the session. The client never supplies a team id,
  a score, a checkpoint state or a routing decision.
- Scan processing runs in one transaction that starts with `SELECT … FOR UPDATE` on the
  team row, and a partial unique index enforces one successful scan per team per
  checkpoint. Two phones scanning at the same instant score once.
- Every scan attempt is recorded, including rejections, with IP and user agent.
- Rate limiting is database-backed at 10 scans per player per minute.
- Challenge answers are graded server side and never sent to the browser.

---

## Design system

Three interfaces share one set of tokens and have deliberately different
information density: the player app is mobile-first and objective-led, the
organizer console is desktop-first and dense, the volunteer console does one job.

Colour lives entirely in tokens defined at the top of `app/globals.css`. Three
rules are documented there and worth knowing before changing any of them:

1. **Hue separation.** The brand is lime and the "available" traffic state is
   emerald, which are close. They are kept about 40 degrees apart in hue.
2. **Lime is never a status.** `--primary` is for interactive and brand surfaces
   only. Status uses the four status tokens.
3. **Status never relies on colour alone.** Every traffic indicator ships a word
   and a distinct glyph as well as a fill, via `TrafficBadge`. This is also what
   makes the game readable for colour-blind organizers.

Contrast was measured rather than eyeballed. Lime at its brand lightness reaches
only 2.36:1 on white, so it is a fill, never text; `--primary-strong` and
`--success-strong` are the text-safe variants at 6.2:1 and 5.7:1.

**Motion rule.** Nothing that carries information animates its opacity from 0.
An entrance fade that fails to run leaves a clue or a button invisible, which
mid-game means a stranded team. Content animates transform only and reads
correctly even if no animation fires. Framer Motion is configured once with
`reducedMotion="user"`, so no component guards it individually.

---

## Project layout

```
app/
  (player)/
    login/            entry screen
    (game)/           signed-in tabs behind the bottom nav
      dashboard/      objective-first home
      clue/           focused clue with progressive levels
      scan/           near-full-screen scanner
      team/           members, presence, progress
      activity/       chronological feed
      leaderboard/
    scan/[token]/     direct link from a phone camera, outside the tabs
  admin/              dashboard, map, routing, leaderboard, teams, players,
                      volunteers, announcements, checkpoints, challenges,
                      qr, game, settings, audit
  volunteer/          verification console
  api/qr/[id]         QR image endpoint, admin only
lib/
  auth/         player and admin sessions, role checks, audit logging
  game-engine/  processScan, advanceTeam, challenge completion, clues
  routing/      the engine, its weights, traffic calculation
  challenges/   per-type schemas and server-side grading
  scoring/      leaderboard from the score ledger
  validation/   CSV roster parsing
prisma/         schema and seed
scripts/        one-off verification scripts
```

---

## Tests

```bash
npm test
```

Covers the routing engine (spreading, capacity, visited exclusion, weight tuning),
challenge grading (including that answers never leak to the client), the CSV
parser, announcement audience and scheduling rules, sidebar route matching, and
the QR poster origin.

Two scripts check behaviour that needs a live database:

```bash
npx tsx scripts/concurrency-check.ts
npx tsx scripts/paused-scan-check.ts
```

---

## Notes and deliberate omissions

- **Live updates use polling**, not websockets. Pages are Server Components refreshed on
  an interval that pauses when the tab is hidden. Swapping in Supabase Realtime means
  calling the same `router.refresh()` from a subscription.
- **Roster import is CSV only.** Export from Excel as CSV.
- **Photo submissions are stored as data URLs** in the database. Move them to Supabase
  Storage before running a large event.
- **Route previews are straight lines** with great-circle distances rather than
  Directions API walking paths.
- Inventory, rewards and power-ups are out of scope by design.
