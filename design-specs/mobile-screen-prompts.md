# Campus Treasure Hunt — Mobile Screen Image Prompts

## Design Bible

### Platform Mode
Cross-platform premium neutral. Clean safe-area handling, universal mobile navigation patterns, premium but broadly buildable visual language.

### Theme Paradigm
Deep dark. The game runs on a dark campus at night — the UI should feel like a premium game interface, not a corporate tool.

### Typography Character
Expressive premium display + clean body. Large score numbers, bold objective headlines, clean supporting text.

### Structure Bias
Dashboard-led overview. The player always sees their score, rank, and current objective first.

### Image Art Direction Bias
Cinematic lifestyle imagery + atmospheric campus backdrops. Photography-led moments for onboarding and key screens.

### Texture / Surface Treatment
Ultra-subtle grain. A faint film-grain overlay on dark surfaces to avoid sterile flatness.

### Palette Logic
Rich dark base + refined warm accent.
- Background: near-black with green undertone `oklch(0.155 0.012 150)`
- Surface: slightly elevated dark `oklch(0.196 0.013 150)`
- Brand: vibrant lime `oklch(0.8 0.21 128)` — used for interactive elements, score emphasis, CTAs
- Success: emerald `oklch(0.72 0.15 165)` — available checkpoints, completed tasks
- Warning: warm amber `oklch(0.79 0.16 75)` — paused state, approaching capacity
- Danger: muted red `oklch(0.68 0.21 20)` — errors, penalties
- Info: cool blue `oklch(0.7 0.15 250)` — informational states
- Text primary: near-white `oklch(0.97 0.006 130)`
- Text muted: `oklch(0.72 0.014 140)`
- Text faint: `oklch(0.58 0.012 140)`

### Signature Component Set
1. Large hero metric card (score display)
2. Objective card with progressive reveal
3. Compact stat strip (checkpoints/challenges)
4. Achievement tile row

### Decorative Asset Set
1. Dotted arc accents (wayfinding motif)
2. Mini geometric markers (checkpoint pins)

### Motion-Implied Language
1. Springy card lift energy (scanning success)
2. Staggered list reveal energy (leaderboard, activity)

### Device Frame
Clean iPhone 15 Pro-style mockup. Consistent scale across all screens. Subtle shadow. Even outer margins. Content is hero, frame is support.

---

## Screen 1: Player Login

### Context
The entry point. A team member opens the app and enters their credentials. This should feel like a game opening, not a corporate login.

### Prompt
```
Premium dark mobile app login screen inside a clean iPhone 15 Pro mockup with visible frame, centered on a dark canvas with even outer margins.

App: Campus Treasure Hunt — a campus-wide QR treasure hunt game.

Screen composition:
- Dark background with subtle film grain texture, near-black with green undertone
- Two soft lime-colored ambient glows (one top-left, one bottom-right) creating atmospheric depth without gradients — these are soft diffused light blobs, not sharp gradients
- Center-top: a rounded square icon badge in vibrant lime green with a white compass icon inside, casting a subtle shadow
- Below icon: "Campus Hunt" in large bold white text, clean sans-serif
- Below title: "Enter your team credentials to continue." in muted gray, smaller text
- A clean card with subtle border and dark surface background containing:
  - "Team name" input field with dark background, subtle border, placeholder text
  - "Member code" input field, same style
  - "6-digit PIN" input field, same style, with number keyboard hint
  - A full-width lime green button labeled "Sign in" with dark text on it
- Below card: "Need help? Find an organizer." in faint gray text
- Below that: "Organizer sign in" as a subtle underlined link

Design rules:
- Generous spacing between all elements
- Text is comfortably large and readable
- The lime green is used sparingly — only on the icon badge and the sign-in button
- Dark surfaces have very subtle border differentiation
- No gradients, no glassmorphism, no purple-blue clichés
- The overall feel is premium game UI, clean and inviting
- Safe areas respected: status bar space at top, home indicator space at bottom
- Phone mockup has subtle drop shadow, even padding on all sides
```

---

## Screen 2: Dashboard (Main Game Hub)

### Context
The player's home screen after login. Shows score, rank, current objective, and progress. This is the most important screen — it answers "where am I and what do I do next?"

### Prompt
```
Premium dark mobile app dashboard screen inside a clean iPhone 15 Pro mockup with visible frame, centered on a dark canvas with even outer margins.

App: Campus Treasure Hunt — a campus-wide QR treasure hunt game.

Screen composition:
- Dark background with subtle grain texture
- Top section (header area):
  - Left-aligned team name "Alpha Squad" in bold white text
  - Right-aligned: a large lime green score number "2,450" with small "pts" label
  - Below: rank displayed as "#3" with "of 24 teams" in muted text
  - A thin horizontal divider line
- Main content area (spacious):
  - A prominent "Objective" card with slightly elevated dark surface:
    - Small label "NEXT DESTINATION" in uppercase lime green text with a small compass icon
    - A clue headline in large white text: "Where knowledge sleeps beneath open sky"
    - Below: "About 4 min walk" with a small footprints icon in muted text
    - At bottom of card: a subtle dotted arc decorative element
  - A compact stat strip with two side-by-side tiles:
    - Left tile: "Checkpoints" label with "7/12" in bold white
    - Right tile: "Challenges" label with "3" in bold white
    - Both tiles have dark surface background with subtle border
  - An announcements section (if present):
    - Small "ANNOUNCEMENTS" label with bell icon
    - One or two announcement items with message text and timestamp
- Bottom navigation bar (fixed):
  - 5 tabs: Home (active, lime green), Clue, Scan (center, larger lime green circle), Team, Activity
  - Active tab has lime green icon and label
  - Inactive tabs are muted gray
  - The Scan button in center is a raised lime green circle with a viewfinder icon, slightly elevated above the nav bar

Design rules:
- The score number should be the most visually prominent element
- Generous vertical spacing between sections
- Cards have subtle borders, no heavy shadows
- The objective card is the primary focal point after the score
- Bottom nav is clean with clear active state
- Text hierarchy: score > objective headline > stat values > labels > muted text
- No fake charts, no unnecessary widgets
- Phone mockup with clean frame, even margins
```

---

## Screen 3: Clue View (Destination Clue)

### Context
The player taps into their clue to see the full destination hint with progressive levels. More detail than the dashboard objective card.

### Prompt
```
Premium dark mobile app clue screen inside a clean iPhone 15 Pro mockup with visible frame, centered on a dark canvas with even outer margins.

App: Campus Treasure Hunt — a campus-wide QR treasure hunt game.

Screen composition:
- Dark background with subtle grain texture
- Top header: a small back arrow with "Home" text in muted gray, left-aligned
- Content area:
  - Small label "NEXT DESTINATION" in uppercase lime green with compass icon
  - Large clue text in bold white: "Where knowledge sleeps beneath open sky, find the stone that watches over all" — this is the main focal point, large readable type
  - Below: walking time "About 4 min walk" with footprints icon in muted text
  - An info card with subtle border: "Find this location, then scan the QR poster you see there." in clean body text
  - A "Clue levels" section showing progressive hint system:
    - Level 1 (unlocked, current): shown with a lime green dot, text visible
    - Level 2 (locked): shown with a gray lock icon, text hidden
    - Level 3 (locked): shown with a gray lock icon, text hidden
    - A subtle "Request next hint" button that is slightly muted (costs points)
  - Below: a full-width lime green button "Open scanner" with a viewfinder icon
- Bottom nav bar (same as dashboard)

Design rules:
- The clue text should be large, bold, and highly readable — this is the hero content
- Generous spacing around the clue text
- Clue levels should feel like a progression system, not just a list
- The scanner CTA button should be prominent and inviting
- No clutter, no unnecessary elements
- The screen should feel focused and purposeful — one job: read the clue, go scan
- Phone mockup with clean frame, even margins
```

---

## Screen 4: QR Scanner

### Context
The player opens the camera to scan a QR code at a checkpoint. This is an action screen — minimal chrome, maximum camera visibility.

### Prompt
```
Premium dark mobile app QR scanner screen inside a clean iPhone 15 Pro mockup with visible frame, centered on a dark canvas with even outer margins.

App: Campus Treasure Hunt — a campus-wide QR treasure hunt game.

Screen composition:
- The screen is dominated by a simulated camera view (dark with a subtle viewfinder overlay)
- Top: a small back arrow with "Home" text in white, left-aligned, overlaying the camera view
- Center of screen: a large rounded-rectangle viewfinder frame with:
  - Thin lime green corner brackets (not a full border, just the four corners)
  - A subtle scanning line animation implied (a thin horizontal lime green line across the middle)
  - The viewfinder area shows a dark semi-transparent camera simulation
- Below the viewfinder: a text prompt "Point your camera at a QR code" in white text
- Bottom area: 
  - A small instruction "Scan the QR poster at your checkpoint" in muted text
  - No bottom nav bar (this is a full-screen scanner mode)

Design rules:
- Maximum camera visibility — minimal UI chrome
- The viewfinder should feel premium and game-like, not generic
- Lime green is used only on the viewfinder corners and scanning line
- Text overlays should be readable against the dark camera view
- The screen should feel immersive and focused
- Safe areas respected for status bar and home indicator
- Phone mockup with clean frame, even margins
```

---

## Screen 5: Leaderboard

### Context
Live team rankings. Shows position, team names, and scores. The player wants to see how they compare.

### Prompt
```
Premium dark mobile app leaderboard screen inside a clean iPhone 15 Pro mockup with visible frame, centered on a dark canvas with even outer margins.

App: Campus Treasure Hunt — a campus-wide QR treasure hunt game.

Screen composition:
- Dark background with subtle grain texture
- Header area:
  - Trophy icon in muted gray next to "Leaderboard" in bold white text
  - Below: "24 teams competing" in muted text (or delay info if applicable)
  - Thin horizontal divider
- Content area:
  - Top 3 teams displayed as hero items:
    - #1: Gold-tinted row with team name "Night Owls" and score "3,200" — slightly larger, with a subtle gold accent
    - #2: Silver-tinted row with team name "Alpha Squad" and score "2,450" — current team highlighted with lime green left border
    - #3: Bronze-tinted row with team name "Code Breakers" and score "2,100"
  - Remaining teams in a clean list:
    - Each row: rank number, team name, score aligned right
    - Subtle separator lines between rows
    - Current team's row highlighted with lime green left accent
  - Ranks 4-10 shown with slightly muted text
- Bottom nav bar (same as dashboard)

Design rules:
- Top 3 should feel like a podium — visually distinct from the rest
- Current team should be clearly highlighted
- Score numbers should be prominent with tabular nums
- Clean list structure, no unnecessary cards or containers
- The gold/silver/bronze treatment should be subtle (tinted backgrounds, not loud colors)
- Generous row height for touch targets
- Phone mockup with clean frame, even margins
```

---

## Screen 6: Team Info

### Context
Shows team members, online status, score, rank, and progress. The player checks who's on their team and what they've accomplished.

### Prompt
```
Premium dark mobile app team info screen inside a clean iPhone 15 Pro mockup with visible frame, centered on a dark canvas with even outer margins.

App: Campus Treasure Hunt — a campus-wide QR treasure hunt game.

Screen composition:
- Dark background with subtle grain texture
- Header area:
  - Small uppercase label "YOUR TEAM" in muted text
  - Team name "Alpha Squad" in large bold white text
  - Below: "5 members · 3 online" in muted text
  - Thin horizontal divider
- Content area:
  - A stat strip with 3 tiles side by side:
    - Score: "2,450" in bold white with trophy icon
    - Rank: "#3" in bold white with users icon
    - Checkpoints: "7/12" in bold white with flag icon
    - Each tile has dark surface background with subtle border
  - Members section:
    - "MEMBERS" label in uppercase muted text
    - List of team members:
      - Each member row: a small green dot (online) or gray dot (offline), member name, status text
      - "You" label next to current player's name
      - Clean list with subtle hover state
  - Progress section:
    - "PROGRESS" label in uppercase muted text
    - Key-value rows:
      - "Checkpoints completed" → "7 of 12"
      - "Challenges completed" → "3"
      - "Current objective" → "Travelling to your next clue"
  - Sign out button: full-width outline button at bottom
- Bottom nav bar (same as dashboard)

Design rules:
- The stat strip should feel like a quick overview — 3 clear numbers
- Member list should be clean and scannable with online indicators
- Progress section provides detail without clutter
- Generous spacing between sections
- The sign out button should be subtle, not prominent
- Phone mockup with clean frame, even margins
```

---

## Screen 7: Activity Feed

### Context
Chronological log of everything the team has done. Scans, challenges, redirects, score changes.

### Prompt
```
Premium dark mobile app activity feed screen inside a clean iPhone 15 Pro mockup with visible frame, centered on a dark canvas with even outer margins.

App: Campus Treasure Hunt — a campus-wide QR treasure hunt game.

Screen composition:
- Dark background with subtle grain texture
- Header area:
  - "Activity" in bold white text
  - Below: "Everything your team has done, newest first." in muted text
  - Thin horizontal divider
- Content area:
  - A clean chronological feed with items:
    - Each item row:
      - Left: a small icon (green checkmark for completed, puzzle for challenge, shuffle for redirect, etc.)
      - Center: message text in white, timestamp in faint gray below
      - Right: score change "+150" in green or "-25" in red (if applicable)
    - Rows have subtle hover/press state
    - Items separated by thin lines or generous spacing
  - Sample items:
    - Checkpoint completed: green check icon, "Completed checkpoint: Library Annex", "+150", "2:34 PM"
    - Challenge solved: puzzle icon, "Solved: Riddle of the Stones", "+200", "2:28 PM"
    - Redirected: shuffle icon, "Routing engine sent you to East Gate", "2:15 PM"
    - Clue purchased: compass icon, "Requested next clue level", "-25", "2:10 PM"
    - Scan rejected: red X icon, "Scan rejected: already visited", "2:05 PM"
  - If no activity: a centered empty state with activity icon, "Nothing yet" heading, and explanatory text
- Bottom nav bar (same as dashboard)

Design rules:
- The feed should be clean and scannable
- Each row has clear visual hierarchy: icon → message → score → time
- Score changes are color-coded: green for gains, red for penalties
- Icons help quickly identify event types
- Generous row height for readability
- No unnecessary cards or containers — just a clean list
- Phone mockup with clean frame, even margins
```
