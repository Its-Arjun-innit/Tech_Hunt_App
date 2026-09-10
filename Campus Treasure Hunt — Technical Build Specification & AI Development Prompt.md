# Campus Treasure Hunt — Full Technical Build Prompt

Build a production-ready, responsive web application for a **campus-wide QR-code treasure hunt game**.

The application must be designed as a modern full-stack web app that can be deployed on **Vercel's free/low-cost infrastructure** and should avoid unnecessary infrastructure that makes deployment complicated or expensive.

The system must be modular and extensible so the game engine can later support additional challenge types and game mechanics.

---

# 1. Core Game Concept

The game consists of multiple teams competing around a physical campus.

Organizers create teams and players in advance.

Players do NOT publicly register.

Each player logs in using:

- Team Name
- Member Code
- 6-digit PIN

Players then use their phone/browser during the game.

The core game loop is:

SCAN QR
→ VERIFY CHECKPOINT
→ AWARD TEAM POINTS
→ DETERMINE NEXT CHECKPOINT
→ GENERATE LOCATION CLUE
→ TEAM TRAVELS
→ SCAN NEXT QR
→ REPEAT

The most important game-engine requirement is **dynamic routing**.

The system must NOT simply send every team through the same checkpoint sequence.

If Team A scans Checkpoint 4, it may receive Checkpoint 7.

If Team B scans Checkpoint 4 shortly afterward, it may receive Checkpoint 9.

The routing engine should continuously attempt to distribute teams across available checkpoints.

---

# 2. Recommended Tech Stack

## Frontend

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons

Use the Next.js App Router.

The UI must be responsive and mobile-first because most players will use phones.

Admin interfaces should also work well on desktop/tablet.

---

# 3. Backend

Use the Next.js backend architecture rather than maintaining a separate server initially.

Use:

- Next.js Server Actions
- Next.js Route Handlers
- Server Components where appropriate
- Client Components only where interactivity is required

All important game logic must execute server-side.

Never trust the client for:

- Points
- Checkpoint completion
- Team score
- Challenge completion
- Routing decisions
- Game state
- Authentication state

The browser should request actions from the backend and the backend should validate and commit them.

---

# 4. Database

Recommended database:

**PostgreSQL**

Use:

**Supabase PostgreSQL**

because it provides a generous free tier and works well with Vercel.

Use **Prisma ORM** or **Drizzle ORM**.

Preferred:

- PostgreSQL
- Prisma
- Supabase

Database must contain at minimum:

## Users / Players

Fields:

- id
- teamId
- memberCode
- pinHash
- name
- status
- lastLoginAt
- lastActiveAt
- createdAt
- updatedAt

Never store the PIN in plaintext.

Use a secure password hashing algorithm such as Argon2id or bcrypt.

---

# 5. Team Model

Teams contain multiple players.

Fields:

- id
- name
- code
- score
- currentCheckpoint
- currentDestination
- status
- createdAt
- updatedAt

Score should preferably be calculated from a reliable event/transaction system rather than blindly trusting a mutable client-side score.

Team progress is shared.

If one player scans a QR:

The points belong to the entire team.

---

# 6. Authentication

Do NOT implement public registration.

Organizers create:

- Teams
- Players
- Member Codes
- PINs

Player login:

Team Name
+
Member Code
+
6-digit PIN

After successful authentication, create a secure session.

Recommended:

- HTTP-only secure cookies
- Server-side session validation
- Short-lived access/session tokens
- Refresh mechanism where necessary

Optionally enforce:

**One active device/session per player.**

Admin should be able to:

- Force logout
- Reset PIN
- Disable player
- Reactivate player
- View last active time

---

# 7. Admin Authentication

Admin accounts must use a separate authentication mechanism.

Admin functionality must NEVER be exposed through player routes.

Admin roles can include:

- Super Admin
- Game Admin
- Volunteer

Use role-based authorization.

---

# 8. Game Database Model

Create a generic game engine rather than hardcoding the treasure hunt.

Core entities:

GAME

TEAM

PLAYER

CHECKPOINT

CHECKPOINT_ROUTE

CHALLENGE

CHALLENGE_ATTEMPT

SCAN_EVENT

ROUTING_ASSIGNMENT

CLUE

VOLUNTEER

ANNOUNCEMENT

AUDIT_LOG

GAME_EVENT

---

# 9. Checkpoints

Every physical checkpoint has:

- id
- name
- description
- QR token
- latitude
- longitude
- points
- capacity
- active/inactive state
- route group
- difficulty
- challenge configuration
- allowed next checkpoints
- clue configuration

Each checkpoint receives a unique QR code.

The QR code should contain an opaque identifier/token.

Do NOT expose sensitive internal database IDs unnecessarily.

Example:

/scan/cp_x8k29f

The backend resolves that token to the checkpoint.

---

# 10. QR Scan System

Player scans QR using their phone camera.

The web application should provide a QR scanner interface using a browser-compatible QR scanning library.

Recommended options:

- html5-qrcode
- @zxing/browser

Flow:

PLAYER SCANS QR

→ Browser obtains QR token

→ Send token to server

→ Server validates:

- authenticated player
- active game
- team status
- checkpoint exists
- checkpoint active
- checkpoint is valid for this team
- checkpoint has not already been completed by this team
- scan is not duplicated
- rate limit is not exceeded

Then:

→ Record scan event

→ Award points

→ Update team progress

→ Run routing engine

→ Select next checkpoint

→ Generate next location clue

→ Return result to player

---

# 11. Scan Audit System

Every scan must create an immutable event.

Store:

- scan ID
- team ID
- player ID
- checkpoint ID
- timestamp
- IP metadata where appropriate
- user agent/device metadata where appropriate
- scan result
- points awarded
- routing decision

This is required for:

- Anti-cheating
- Dispute resolution
- Debugging
- Game history
- Admin analytics

---

# 12. Dynamic Routing Engine

This is one of the most important components.

When a team completes a checkpoint, the backend should determine its next destination.

Do NOT use a fixed sequence.

Do NOT simply choose the nearest checkpoint.

The routing engine should evaluate:

- Team's current location
- Current checkpoint
- Candidate checkpoints
- Other teams' current checkpoints
- Other teams' assigned destinations
- Teams predicted to arrive soon
- Checkpoint capacity
- Distance
- Estimated travel time
- Checkpoint availability
- Previous visits
- Game progression
- Difficulty
- Route group restrictions
- Recent checkpoint usage
- Congestion

---

# 13. Soft Reservation System

When Team A is assigned Checkpoint 9:

Checkpoint 9 immediately receives a temporary "approaching team" reservation.

For example:

Checkpoint 9:

Current teams: 0

Approaching teams: 1

Status:

YELLOW / APPROACHING

This prevents the routing engine from sending every other team to Checkpoint 9.

Reservations should expire automatically if:

- Team reaches checkpoint
- Team receives another assignment
- Assignment expires
- Admin redirects team
- Game is paused/ended

---

# 14. Checkpoint Traffic States

Each checkpoint should have a calculated traffic status.

GREEN:

Available

YELLOW:

Teams approaching

RED:

Congested / at capacity

Admin should be able to see this visually.

---

# 15. Routing Score

Implement a weighted scoring system.

Conceptually:

routingScore =

distanceScore
+
progressionScore
+
difficultyScore
+
routeCompatibility

-

currentOccupancy
-
approachingTeams
-
recentVisits
-
capacityRisk
-
unavailableState

The exact weights should be configurable.

Do not hardcode routing weights throughout the application.

Create a routing configuration object.

Example:

ROUTING_CONFIG = {

distanceWeight,

congestionWeight,

approachingWeight,

capacityWeight,

progressionWeight,

difficultyWeight,

recentVisitWeight

}

This allows the organizer/developer to tune the game without rewriting the routing engine.

---

# 16. Route Groups

Organizers should be able to define controlled routing possibilities.

Example:

Checkpoint 4

Possible next checkpoints:

- Checkpoint 7
- Checkpoint 9
- Checkpoint 12

The routing engine chooses one based on live game conditions.

This provides controlled randomness rather than completely random routing.

---

# 17. Google Maps Integration

The **Admin Panel must include Google Maps integration specifically for game setup and hint/checkpoint configuration.**

Use:

**Google Maps Platform**

Recommended APIs:

- Maps JavaScript API
- Places API
- Geocoding API
- Directions API where required

The Google Maps API key must NEVER be exposed as a private server secret.

Use appropriate Google Maps restrictions and environment variables.

Admin checkpoint editor should allow:

1. Search for a campus location.
2. Select a place.
3. Drop/move a marker.
4. Store latitude/longitude.
5. View nearby checkpoints.
6. See distance between checkpoints.
7. Define possible next checkpoints.
8. Define route groups.
9. Configure the destination associated with a clue.
10. Preview the route between checkpoints.

Example admin interface:

CHECKPOINT 04

Location:

[ Google Maps ]

Latitude:
28.xxxxx

Longitude:
77.xxxxx

Possible destinations:

☑ Checkpoint 07
☑ Checkpoint 09
☐ Checkpoint 12
☐ Checkpoint 15

Distance / travel estimates:

CP07 — 120m
CP09 — 240m
CP12 — 310m

This map is primarily an **organizer/game-design tool**.

Players do not necessarily need to see the actual map.

---

# 18. Hint / Clue System

Hints are NOT challenge-solving hints.

They guide the team toward their NEXT physical checkpoint.

After a successful checkpoint:

1. Award points.
2. Routing engine chooses destination.
3. System retrieves clue associated with that destination.
4. Player receives the clue.

Example:

"You've earned 50 points.

Your next destination:

Where students gather when the day is getting started."

The clue should indirectly/directly identify a physical campus location.

---

# 19. Progressive Clues

Support multiple clue levels.

Example:

Level 1:

Cryptic clue

Level 2:

More descriptive clue

Level 3:

Very clear clue

Level 4:

Direct location instruction

Admin can configure how many levels exist.

Optionally:

- Unlock automatically after time
- Unlock after a team requests it
- Cost points
- Cost time

These mechanics should be configurable rather than hardcoded.

---

# 20. Anti-Congestion Hint Design

The clue system must work with dynamic routing.

Do not design one universal clue after each checkpoint.

Instead:

Checkpoint 4 may route:

Team A → CP7 → CP7 clue

Team B → CP9 → CP9 clue

Team C → CP12 → CP12 clue

Therefore, each destination has its own clue configuration.

This allows teams to receive different destinations even after completing the same checkpoint.

---

# 21. Challenge System

Support:

### QR Challenge

Scan and receive points.

### Quiz

Multiple choice questions.

### Puzzle

Text/image-based puzzle.

### Riddle

Answer-based challenge.

### Physical Challenge

Volunteer verifies completion.

### Photo Proof

Team submits a photo.

### Multi-stage Challenge

Several steps must be completed.

Each challenge can configure:

- Points
- Maximum attempts
- Time limit
- Success condition
- Failure condition
- Penalty
- Unlock requirement

---

# 22. Volunteer Interface

Create a simplified Volunteer Mode.

Volunteers should NOT have full admin access.

Volunteer can:

- Log in
- Find a team
- View assigned challenge
- Verify completion
- Award approved points
- Mark success/failure
- Report an issue

Keep this interface extremely simple because volunteers may be using phones while standing at physical challenge locations.

---

# 23. Player Dashboard

The player dashboard should display:

- Team name
- Team score
- Current rank
- Game timer
- Checkpoints completed
- Challenges completed
- Team members
- Online/offline members
- Current objective
- Current location clue
- Notifications
- Recent activity

Do NOT reveal undiscovered checkpoint locations.

---

# 24. Leaderboard

Provide live leaderboard.

Show:

- Rank
- Team
- Points
- Checkpoints
- Challenges

Optionally allow organizers to enable delayed leaderboard updates to reduce competitive exploitation.

---

# 25. Admin Dashboard

Admin dashboard should provide:

## Overview

- Game status
- Countdown
- Teams active
- Players online
- Total scans
- Checkpoints completed
- Current congestion

## Teams

- Create/edit teams
- Add/remove members
- Reset PIN
- Disable player
- Force logout
- View team progress
- View current destination
- Manually redirect team

## Checkpoints

- Create
- Edit
- Delete/deactivate
- Generate QR
- Download/print QR
- Set points
- Set capacity
- Set location
- Configure route group
- Configure destination options

## Google Maps

- View all checkpoints
- Add checkpoint by map
- Move checkpoint
- Search locations
- View routes
- View distances
- View congestion

## Challenges

Create/configure challenge types.

## Routing

Live routing overview:

Team A → CP09

Team B → CP12

Team C → CP07

Show:

- Current location
- Assigned destination
- Approaching teams
- Checkpoint capacity
- Traffic status

Allow:

- Redirect
- Disable checkpoint
- Unlock checkpoint
- Override destination

## Announcements

Broadcast messages to all teams or selected teams.

## Audit Logs

Show all important game events.

---

# 26. Live Game Map

Admin should have a live map.

Display:

- Checkpoints
- Team positions where available
- Current checkpoint
- Assigned destination
- Approaching teams
- Volunteer locations
- Checkpoint traffic
- Disabled checkpoints

Use different visual states:

GREEN = available

YELLOW = approaching

RED = congested

GRAY = disabled

The map should update without requiring a full page refresh.

---

# 27. Real-Time Updates

Use Supabase Realtime where appropriate.

Real-time events can update:

- Team status
- Leaderboard
- Checkpoint traffic
- Routing assignments
- Admin dashboard
- Announcements

Do not make every application component dependent on realtime.

The database remains the source of truth.

---

# 28. Game Controls

Admin can:

- Create game
- Configure game
- Start game
- Pause game
- Resume game
- End game
- Set start time
- Set end time
- Set countdown
- Freeze scoring
- Lock scans
- Reopen game

When the game ends:

- Stop new scans
- Stop scoring
- Freeze routing
- Generate final rankings

---

# 29. Security

Implement:

- Server-side authorization
- Secure sessions
- Hashed PINs
- Rate limiting
- QR replay protection
- Duplicate scan prevention
- Server-side score calculation
- Input validation
- CSRF protection where applicable
- XSS-safe rendering
- SQL injection protection through ORM
- Admin role checks
- Audit logging

Never trust:

- Client-side score
- Client-supplied team ID
- Client-supplied checkpoint state
- Client-supplied points
- Client-supplied routing decision

---

# 30. Architecture

Recommended architecture:

USER PHONE / BROWSER

↓

NEXT.JS APPLICATION

↓

SERVER ACTIONS / API ROUTES

↓

GAME ENGINE

↓

POSTGRESQL / SUPABASE

↓

REALTIME EVENTS

External services:

Google Maps Platform
Supabase
Vercel

Architecture should remain simple enough to deploy as one Next.js project.

Do NOT initially create:

- Separate Node.js backend
- Kubernetes
- Docker infrastructure
- Redis server
- Dedicated WebSocket server
- Microservices

These add unnecessary deployment complexity for the MVP.

---

# 31. Hosting

The project must be designed to deploy on:

**Vercel**

Frontend + Next.js backend:

Vercel

Database:

Supabase PostgreSQL

Realtime:

Supabase Realtime

Maps:

Google Maps Platform

Source control:

GitHub

Deployment flow:

GitHub
→ Vercel
→ Automatic deployment

Use environment variables for:

DATABASE_URL
DIRECT_URL
AUTH_SECRET
GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

Never commit secrets to GitHub.

---

# 32. Vercel Compatibility

The application must be compatible with Vercel serverless execution.

Avoid long-running server processes.

Avoid in-memory global state.

Do not depend on local filesystem persistence.

Do not depend on a permanently running WebSocket server.

Use database-backed state.

Use Supabase Realtime for live updates.

Scheduled/background functionality should use appropriate Vercel-compatible mechanisms or database-driven expiration checks.

---

# 33. Project Structure

Use a clean structure similar to:

app/
  (player)/
    login/
    dashboard/
    scan/
    challenge/
  admin/
    dashboard/
    teams/
    players/
    checkpoints/
    routing/
    challenges/
    map/
    game/
    announcements/
    audit/
  volunteer/
    dashboard/

components/
  ui/
  player/
  admin/
  volunteer/
  map/
  qr/

lib/
  auth/
  db/
  game-engine/
  routing/
  qr/
  scoring/
  challenges/
  maps/
  validation/

prisma/
  schema.prisma

types/

utils/

---

# 34. Game Engine Design

Create a dedicated game engine layer.

Example:

gameEngine.processScan()

This should handle:

1. Validate player session.
2. Identify team.
3. Validate game state.
4. Validate checkpoint.
5. Prevent duplicate scan.
6. Record scan event.
7. Award points.
8. Update team progress.
9. Calculate checkpoint traffic.
10. Run routing engine.
11. Create routing assignment.
12. Create soft reservation.
13. Select clue.
14. Return next objective.

Keep this logic out of UI components.

---

# 35. Routing Engine API

Create something conceptually similar to:

routingEngine.getNextCheckpoint({
    teamId,
    currentCheckpointId
})

It should return:

{
    checkpointId,
    score,
    reason,
    estimatedTravelTime,
    clueId,
    reservationExpiresAt
}

The "reason" can be stored for debugging/admin purposes.

Example:

Selected CP09 because:

- CP07 has 3 approaching teams
- CP12 is outside preferred distance
- CP09 has capacity
- Team has not visited CP09
- CP09 matches route group

---

# 36. Database Transactions

Checkpoint completion must use a database transaction.

Example:

BEGIN

Validate scan

Create scan event

Award points

Update team

Create routing assignment

Create checkpoint reservation

Commit

This prevents two simultaneous requests from awarding duplicate points.

---

# 37. Admin Game Setup Workflow

Admin should be able to configure the game in this order:

1. Create Game
2. Create Teams
3. Add Players
4. Generate Member Codes
5. Generate PINs
6. Create Checkpoints
7. Place checkpoints on Google Maps
8. Set checkpoint points/capacity
9. Configure possible routes
10. Configure destination clues
11. Create challenges
12. Configure volunteers
13. Preview routing
14. Print QR posters
15. Start game

---

# 38. Bulk Team/Player Creation

Admin should be able to import CSV/Excel.

Example:

Team Name | Member Name | Member Code

Team Alpha | Player 1 | A001
Team Alpha | Player 2 | A002
Team Beta | Player 1 | B001

System generates secure 6-digit PINs.

Provide an export/print view for organizers to distribute login information privately.

Never display player PINs publicly inside the player interface.

---

# 39. QR Generation

Admin should be able to:

- Generate QR
- Preview QR
- Download QR
- Print QR
- Regenerate QR
- Disable QR

QR posters should contain:

- Checkpoint name/number
- QR code
- Optional game branding
- Optional short instruction

---

# 40. Responsive Design

Player interface:

Mobile-first.

Target:

- iPhone Safari
- Android Chrome
- Modern mobile browsers

Admin:

Desktop-first but responsive.

Volunteer:

Mobile-first.

Use:

- Tailwind
- shadcn/ui
- Accessible forms
- Large touch targets
- Clear status indicators

---

# 41. Performance

Optimize for low-end mobile devices and campus network conditions.

Use:

- Server Components
- Lazy loading
- Optimized images
- Minimal JavaScript
- Efficient database queries
- Indexed database fields
- Cached static data where appropriate

Do not repeatedly query the database from the browser unnecessarily.

---

# 42. MVP Scope

The first production version MUST include:

1. Player Login
2. Organizer-controlled Teams
3. Player/member management
4. Team Dashboard
5. QR Scanner
6. QR Checkpoints
7. Server-side scoring
8. Dynamic routing engine
9. Soft checkpoint reservations
10. Destination clue system
11. Challenge system
12. Volunteer Mode
13. Leaderboard
14. Admin Dashboard
15. Google Maps checkpoint/hint setup
16. Live checkpoint traffic
17. Game start/pause/end controls
18. Audit logs
19. Security/anti-cheat
20. QR generation/printing

Do NOT implement:

- Inventory/rewards
- Power-ups

These are intentionally excluded from the current scope.

---

# 43. Development Philosophy

Build the application as a **generic campus game engine**, not as a one-off QR scanner.

The architecture should allow future additions without rewriting the core system.

The most important separation is:

PLAYER UI
→ GAME ENGINE
→ ROUTING ENGINE
→ DATABASE

The frontend displays game state.

The backend determines game state.

The routing engine determines where teams go next.

The database is the source of truth.

---

# 44. Final User Experience

Player experience should be extremely simple:

LOGIN

↓

TEAM DASHBOARD

↓

SCAN QR

↓

"Checkpoint completed!"

↓

"+50 points"

↓

"Your next clue: ..."

↓

TEAM TRAVELS

↓

SCAN NEXT QR

↓

REPEAT

The complexity should live inside the backend/admin system, not in the player's interface.

Admin experience should provide complete control over:

GAME

TEAMS

PLAYERS

CHECKPOINTS

GOOGLE MAPS

HINTS

ROUTES

CHALLENGES

VOLUNTEERS

TRAFFIC

LEADERBOARD

ANNOUNCEMENTS

AUDIT LOGS

GAME CONTROLS

The system should be deployable from GitHub to Vercel with minimal configuration and should use Supabase PostgreSQL/Realtime and Google Maps Platform as external services.