# Handoff — Campus Treasure Hunt

Last updated 16 September 2026. Written for whoever picks this up next, including
a future session with no memory of building it.

---

## Where things stand

The app is **built, deployed and working**. A campus-wide QR treasure hunt with
dynamic routing, three interfaces, and a full design system.

| | |
| --- | --- |
| Live | https://tech-hunt-app.vercel.app |
| Repo | https://github.com/Its-Arjun-innit/Tech_Hunt_App (private) |
| Host | Vercel, project `tech-hunt-app` under the `arjuns-projects-9f0d25b1` scope |
| Database | Supabase Postgres, attached through the Vercel Storage tab |
| Branch | `main`, clean and pushed |
| Tests | 44 passing (`npm test`) |
| Routes | 30 pages |

Everything in the original build spec's MVP list is done, and the follow-up
UI/UX brief is done. Nothing is half-finished.

---

## Start here

```bash
npm install
npm run dev
```

The local database is PostgreSQL 17 on `localhost:5432`, database `treasurehunt`,
user `postgres`, password `postgres`. It is already created and migrated. `.env`
is present locally and gitignored.

Reset the demo data at any time:

```bash
npm run db:seed
```

That prints every player login, the admin login and all eight checkpoint scan
URLs. It wipes and recreates only the demo game, so it is safe to re-run.

Default credentials on a fresh seed are `admin@campus.edu` / `admin1234` locally.
**Production uses different ones**, set in the Vercel environment variables
`ADMIN_EMAIL` and `ADMIN_PASSWORD`; the owner chose those and they are not
recorded anywhere in this repo.

---

## The one thing to understand before changing anything

**The routing engine is the point of the product.** Everything else serves it.

When a team scans a checkpoint, the engine picks where they go next by scoring
every candidate, and the assignment it writes doubles as a soft reservation. That
reservation is what stops every team being sent to the same place: the moment
team A is routed somewhere, that checkpoint counts as "approaching" and is
penalised for team B. Two teams finishing the same checkpoint seconds apart get
different destinations. This is verified behaviour, not theory.

- Engine: `lib/routing/engine.ts` — pure and unit tested, no database
- Weights: `lib/routing/config.ts` — every one overridable per game from the admin UI
- Traffic: `lib/routing/traffic.ts` — derived on read, never stored
- Scan pipeline: `lib/game-engine/process-scan.ts`

Reservations expire by comparing a timestamp at read time. There is deliberately
**no cron job and no background worker** anywhere in this app, which is what
keeps it deployable to Vercel as a single project. If you are tempted to add a
scheduler, check first whether a read-time comparison does the job.

---

## Rules that are load-bearing

These are written into the code as comments because breaking them causes real
failures, not just ugly output.

### 1. Colour: lime is never a status

The brand is lime; the "available" traffic state is emerald. They are close on
the colour wheel. Three rules keep them apart, documented at the top of
`app/globals.css`:

- Hue separation of about 40 degrees
- `--primary` is for interactive and brand surfaces only, never a status
- Status never relies on colour alone: every traffic indicator ships a word and
  a distinct glyph via `TrafficBadge`

Contrast was measured, not eyeballed. Lime at brand lightness is only **2.36:1**
on white, so it can be a fill but never text. Use `--primary-strong` (6.2:1) and
`--success-strong` (5.7:1) for text. If you add a colour, measure it.

### 2. Motion: content never fades in from zero

Nothing carrying information animates its opacity from 0. This is not a style
preference. During the build, the scan success screen rendered with the clue and
every button permanently invisible because an entrance fade never ran, which
mid-game means a team stranded at a checkpoint with a blank screen.

Content animates **transform only** and must read correctly if no animation ever
fires. Only decorative pops may fade. Framer Motion is configured once in
`components/motion-provider.tsx` with `reducedMotion="user"`, so no component
needs its own guard.

### 3. The client is never trusted

Team identity always comes from the session. The browser never supplies a team
id, a score, a checkpoint state or a routing decision. Challenge answers are
graded server-side and the correct answers never reach the browser; see
`publicChallengeConfig` in `lib/challenges/grade.ts`.

Scans run in one transaction opening with `SELECT … FOR UPDATE` on the team row,
plus a partial unique index, so two phones scanning at once score exactly once.
`scripts/concurrency-check.ts` proves it against a live database.

---

## Layout

```
app/
  (player)/
    login/              entry screen
    (game)/             signed-in tabs behind the bottom nav
      dashboard/        objective-first home
      clue/             focused clue, progressive levels
      scan/  team/  activity/  leaderboard/
    scan/[token]/       direct link from a phone camera, outside the tabs
  admin/                dashboard, map, routing, leaderboard, teams, players,
                        volunteers, announcements, checkpoints, challenges,
                        qr, game, settings, audit
  volunteer/            verification console
lib/
  auth/                 player and admin sessions, role checks, audit logging
  game-engine/          processScan, advanceTeam, currentTask, clues
  routing/              engine, weights, traffic
  challenges/           per-type schemas and server-side grading
  scoring/              leaderboard from the score ledger
  announcements.ts      audience and scheduling rules
scripts/                migrate-deploy, ensure-admin, verification scripts
```

`currentTask()` in `lib/game-engine/clues.ts` answers "what should this team do
right now". Every player surface calls it. Do not re-derive that logic per page:
doing so is what caused a team mid-hunt to be told it had finished, because a
team held at an unsolved challenge has no routing assignment and "no assignment"
was read as "done".

---

## Deployment

Pushing to `main` deploys. The build itself runs migrations and creates the first
admin, so a fresh environment needs no manual setup:

```
prisma generate && node scripts/migrate-deploy.mjs && tsx scripts/ensure-admin.ts && next build
```

Both steps are idempotent. `scripts/migrate-deploy.mjs` also maps the
`POSTGRES_*` variables that Vercel's Supabase and Neon integrations inject onto
the `DATABASE_URL` Prisma expects, and refuses a `prisma+postgres://` URL with an
explanation, because that scheme needs an extension this app does not use.

Reading deploy logs needs the Vercel CLI pointed at the right scope:

```bash
vercel ls tech-hunt-app --scope arjuns-projects-9f0d25b1
```

**Gotcha that cost real time:** an invalid `VERCEL_TOKEN` is set as a Windows
user environment variable on the owner's machine. It silently overrides
`vercel login`. If CLI commands fail with "token is not valid", clear it with
`setx VERCEL_TOKEN ""` and open a new terminal.

---

## Verifying a change

```bash
npm test                              # 44 unit tests, no database needed
npx tsc --noEmit                      # types
npm run build                         # must pass; Vercel runs the same
npx tsx scripts/concurrency-check.ts  # proves scanning still scores once
npx tsx scripts/paused-scan-check.ts  # proves a paused game rejects scans
```

Run the two scripts after touching anything in `lib/game-engine` or
`lib/routing`. They need the local database seeded.

**About the browser preview in this environment:** it does not run CSS
animations, and `animationend` never fires. Anything that waits on an animation
appears stuck there but is fine in a real browser. Verify visual state by reading
computed styles rather than trusting a screenshot, which is how the two bugs
above were found. Screenshots also wash out colour, so check contrast with
`getComputedStyle` instead.

---

## Known gaps, deliberately

None of these are broken; they are scoped-out choices worth knowing about.

| Gap | Why, and when to revisit |
| --- | --- |
| Live updates poll instead of using websockets | Pages refresh on an interval that pauses when the tab is hidden. Supabase Realtime would be a subscription calling the same `router.refresh()`. Revisit if a game runs with many teams and the refresh feels slow. |
| Photo submissions stored as data URLs | Fine for a small event. Move to Supabase Storage before a large one; the column will grow fast. |
| Roster import is CSV only | Organizers export XLSX to CSV. Add the `xlsx` dependency only if that friction is real. |
| Route previews are straight lines | Great-circle distance rather than Directions API walking paths. The map is a design tool, so this has not mattered. |
| Google Maps key not set | Admin map falls back to a coordinate grid that still shows relative positions and distances. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable the real map. |
| No dark mode toggle | The full dark palette exists and works; nothing exposes a switch yet. |

Inventory, rewards and power-ups were excluded by the original spec.

---

## Loose ends

- `Tech_Hunt_App-main.zip` sits untracked in the working directory. It looks like
  a download of the repo. Nothing depends on it. Delete it or add it to
  `.gitignore`; it was left alone rather than removed without asking.
- `AUTH_SECRET` was removed as dead weight. Sessions are database rows, not
  signed cookies, so nothing read it. If you see it in old notes, ignore it.

---

## If you are running an actual event

1. Create a game, then teams. Import a roster CSV and print the credentials
   sheet. **PINs are shown once and are unrecoverable**; they can only be reset.
2. Create checkpoints, set each one's possible next destinations, and write
   clues cryptic first, clearest last. Clues describe how to reach the
   checkpoint they belong to, so a team gets the clue for wherever it was sent.
3. Post a volunteer at every checkpoint carrying a physical or photo challenge,
   otherwise nobody can verify those teams.
4. Print the QR posters. Confirm they encode the public domain and not
   `localhost`, which is derived automatically on Vercel.
5. Press Start game. Watch the live map for red checkpoints and redirect by hand
   if a team gets stuck.
