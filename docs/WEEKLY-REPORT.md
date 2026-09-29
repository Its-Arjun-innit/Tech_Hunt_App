# Campus Treasure Hunt — Weekly Progress Report

**Project:** a campus-wide QR treasure hunt with dynamic routing, built as one
Next.js application.
**Live:** https://tech-hunt-app.vercel.app
**Repository:** github.com/Its-Arjun-innit/Tech_Hunt_App (private)

---

## Week 1 — Core build and production deployment

### Objectives
- Build the complete game loop: scan, verify, score, route, clue, repeat.
- Deliver all three interfaces: player, organizer and volunteer.
- Deploy to production on Vercel with a hosted database.

### Work completed — Logic
- **Data model.** 17 tables covering games, teams, players, staff, checkpoints,
  routes, clues, challenges, attempts, scans, scores, routing assignments,
  announcements, game events and the audit log.
- **Dynamic routing engine.** Scores every candidate checkpoint on distance,
  progression, difficulty, route match, occupancy, approaching teams, capacity
  and recent visits. All weights are configurable per game. A team's assignment
  acts as a soft reservation, so teams finishing the same checkpoint are spread
  to different destinations.
- **Scan pipeline.** A single database transaction with a row lock on the team,
  validation in a fixed order, and a partial unique index so a team can bank a
  checkpoint only once. Every attempt is logged, including rejections.
- **Scoring.** An append-only score ledger, with the team total cached from it.
  Supports an optional delay on the public leaderboard.
- **Clues.** Up to four levels per destination, unlocking by timer, by request,
  or both, with an optional points cost.
- **Challenges.** Seven types: QR, quiz, puzzle, riddle, physical, photo and
  multi-stage. Graded on the server; answers never reach the browser.
- **Authentication.** Players sign in with team name, member code and a 6-digit
  PIN, one device at a time. Staff use a separate login with three roles:
  super admin, game admin and volunteer.
- **Game control.** Start, pause, resume, end and reopen. Ending locks scanning,
  freezes scoring, cancels reservations and records final rankings.
- **Organizer tools.** Team and player management, CSV roster import with
  generated PINs, checkpoint editor, QR poster printing, live routing with
  manual redirect, announcements and a full audit log.
- **Interface polish.** Loading screens on every admin page, error screens with
  retry, styled confirmation dialogs for destructive actions, current-page
  highlighting, and a live "updated N seconds ago" indicator.

### Work completed — Setup
- Stack chosen and scaffolded: Next.js 16, React 19, TypeScript, Tailwind,
  shadcn/ui, Prisma 6, PostgreSQL.
- Local PostgreSQL 17 installed and configured; demo seed with three teams,
  eight checkpoints, clues, routes and one challenge of every type.
- Private GitHub repository created and connected to Vercel for automatic
  deployment on push.
- Supabase attached as the production database.
- Build configured to apply migrations and create the first organizer account
  automatically, so a new environment needs no manual steps.
- QR posters derive the public site address automatically, so they can never
  encode a local address.

### Challenges and how they were resolved
| Problem | Resolution |
| --- | --- |
| Production returned a server error on every database request | Migrations now run as part of the build |
| Build failed on an empty `DIRECT_URL` | Added a fallback to the main connection string |
| All environment variables had been saved with empty values | Diagnosed from the build log; database re-attached through the Vercel integration |
| Supabase's variable names did not match what Prisma reads | Added automatic mapping of the integration's names |
| A stale Vercel token on the development machine overrode the CLI login | Identified and documented with a one-line fix |
| Two hydration errors from clock-based text | Clock values now render only in the browser |

### Testing
- 37 automated unit tests covering routing, grading, CSV import, QR tokens and
  navigation.
- Concurrency check: two members scanning at the same instant score exactly once.
- Paused-game check: scans are rejected while the game is paused.
- Manual end-to-end run: three teams scanning the same checkpoint were routed to
  three different destinations.

### Plan for next week
- Replace the default styling with a real design system.
- Redesign all three interfaces for their different users.
- Add score adjustment, volunteer management and targeted announcements.
- Write handoff documentation.

---

## Week 2 — Design system, redesign and hardening

### Objectives
- Give each interface a distinct, purpose-built experience on a shared design
  system.
- Add the remaining organizer capabilities.
- Integrate a collaborator's architecture work and document the project.

### Work completed — Logic
- **Resolved a stranding bug.** A team held at an unsolved challenge has no
  routing assignment, and the app read that as "finished", telling a team
  mid-hunt that it had completed everything. One function now decides what a
  team should do next, used by every player screen.
- **Manual score adjustment**, recorded in the score ledger with a mandatory
  reason, visible in the audit log and in the team's own activity feed.
- **Volunteer management:** create accounts, post to checkpoints, reset
  passwords, disable.
- **Targeted, scheduled announcements** for all teams, selected teams,
  volunteers or admins. Scheduling needs no background job.
- **Typed challenge builder** replacing hand-written JSON.
- **Refactors from a collaborator (Darkshadow-01):** every scoring path now goes
  through one function; traffic data is loaded once and shared by the routing
  engine and the admin view; scan validation split into a pure, testable step.
- **Free map fallback.** Without a Google Maps key, the checkpoint editor and
  live map now use OpenStreetMap.

### Work completed — Interfaces
- **Player:** bottom navigation with a prominent scan button; home screen led by
  the current objective; dedicated clue screen with locked levels;
  near-full-screen scanner; short success celebration; team and activity pages;
  animated leaderboard.
- **Organizer:** a top bar showing game status on every page; six-metric
  dashboard; clickable live map with a side panel; sortable, searchable tables;
  new Players, Volunteers, Leaderboard and Settings pages.
- **Volunteer:** a single-purpose screen showing their post, the teams waiting,
  and one large approve button.

### Work completed — Setup
- Design tokens defined for surfaces, brand and four status colours, in light
  and dark themes; every hardcoded colour removed.
- Framer Motion added, configured once to respect the device's reduced-motion
  setting.
- Third database migration for announcement audiences and scheduling.
- Collaborator's work merged from a zip, with their branch preserved.
- Documentation written: `README.md`, `docs/HANDOFF.md` and `docs/DECISIONS.md`.

### Challenges and how they were resolved
| Problem | Resolution |
| --- | --- |
| The lime brand colour sits close to the green "available" status | Kept the hues apart, reserved lime for buttons and brand only, and gave every status a label and icon as well as a colour |
| Measured contrast showed lime text was unreadable at 2.36:1 | Added text-safe colour variants at 6.2:1 and 5.7:1 |
| An entrance animation left the success screen's clue and buttons invisible | Content now animates position only and is always readable |
| A rule in the merged code would have rejected every correct scan | Moved the check back into the transaction and pinned the order with tests |
| Map markers never appeared in the checkpoint editor | Markers now wait for the map to finish loading |

### Testing
- 50 automated unit tests, up from 37, adding announcement rules and scan
  validation order.
- Concurrency and paused-game checks re-run and passing after the merge.
- Every interface checked at phone and desktop sizes; colour contrast measured
  rather than judged by eye.

### Next steps
- **Before running an event:** add the Google Maps key if wanted, post a
  volunteer at each physical or photo challenge, print the QR posters.
- **Deferred deliberately:** live push updates instead of polling, moving photo
  submissions to file storage, a dark-mode switch, and Excel roster import.

---

## Summary

| | Week 1 | Week 2 |
| --- | --- | --- |
| Commits | 8 | 8 |
| Unit tests | 37 | 50 |
| Focus | Game logic, all three interfaces, deployment | Design system, redesign, new capabilities, merge |
