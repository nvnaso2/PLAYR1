# PLAYR1 — Full App Overview
## Every Screen, UI Element & Function

---

## TECH STACK (for reference)
- **Frontend:** React + TypeScript, Tailwind CSS, shadcn/ui components
- **Backend:** Express.js REST API
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Email/password with JWT tokens (httpOnly cookies on web, Bearer tokens on iOS)
- **Mobile:** Capacitor iOS app loading from https://playr1basketball.replit.app
- **Storage:** Replit Object Storage for media files
- **Color scheme:** Dark mode default, orange (#f97316) primary accent

---

## GLOBAL SHELL

### Sidebar Navigation
Every authenticated page sits inside a persistent sidebar layout.

**Player sidebar links:**
- Home (redirects to Dashboard)
- Drills
- Training Log
- Videos
- Career
- Profile
- Find People
- My Trainer (if connected to a trainer)
- My Sessions
- My Evaluations
- Feedback
- Coach Mode toggle (if user has trainer role)
- Admin (if user is admin)

**Trainer sidebar links (when in Trainer Mode):**
- Trainer Dashboard
- Roster
- Drills
- Training Logs
- Chat
- Progress
- Schedule
- Evaluations
- My Profile (trainer public profile editor)

**Global UI elements:**
- PLAYR1 logo in top of sidebar
- Dark/light mode toggle
- User avatar + name at bottom of sidebar
- Sidebar collapses on mobile (hamburger trigger in top bar)

---

## 1. LANDING PAGE (`/`)
Public-facing marketing page shown to unauthenticated users.

**UI Elements:**
- Hero section with PLAYR1 branding and tagline
- "Get Started" and "Sign In" CTA buttons
- Feature highlights (drill library, progress tracking, community)
- Redirects authenticated users to Dashboard

---

## 2. AUTH PAGE (`/auth`)

**Two modes: Sign In / Sign Up (toggled by tabs)**

### Sign In
- Email input
- Password input
- "Forgot Password?" link → `/forgot-password`
- Submit button → validates credentials, sets JWT cookie, redirects to app

### Sign Up
- First name, Last name
- Email
- Password + Confirm password
- Role selector: Player or Trainer
- Submit → creates account, triggers onboarding wizard

### Onboarding Wizard (new users)
Multi-step modal after first login:
1. **Welcome** — greeting, sets expectations
2. **Basic Info** — name, grade level, city/state/zip, birthday
3. **Team Setup** — add team name, team type (school/AAU/pro/etc.), jersey number, positions
4. **Interests** — select training goals (shooting, ball handling, game stats, etc.)
5. **Done** — redirects to relevant first screen based on interests

---

## 3. FORGOT / RESET PASSWORD
- `/forgot-password` — enter email, receive reset link (via SendGrid)
- `/reset-password` — enter new password with token from email link

---

## 4. DASHBOARD / PROGRESS PAGE (`/progress` or home redirect)

The main training analytics hub.

**UI Elements:**

### Time Period Filter
Toggle buttons: Weekly / Monthly / Yearly — all stats update based on selection

### KPI Stat Cards (top row)
Grid of training metric cards, each showing a number + label. Filterable by skill category:
- Total Sessions
- Total Drills
- Total Time (formatted as Xh Ym)
- Makes / Attempts / Shooting %
- Conditioning Time
- Dribbles, Passes, Reps, Score (depending on drill types logged)

**Skill category filter tabs:** All / Shooting / Ball Handling / Passing / Conditioning / Workouts

### Activity Bar Chart
Bar chart of daily/weekly training activity (minutes or sessions) over the selected period. Uses recharts library.

### Drill Category Pie Chart
Pie/donut chart showing breakdown of training time by category (Shooting, Ball Handling, etc.)

### Shot Heatmap
Interactive half-court diagram with zone-by-zone shooting percentages. Zones color from red (0%) to green (100%) based on shooting percentage. Displays: made/attempted counts per zone, percentage label per zone.

**Shot zones:** Paint, Mid-Range (Left/Right/Center), Three Point (Left Corner, Right Corner, Left Wing, Right Wing, Top of Key), Free Throw

---

## 5. DRILLS PAGE (`/drills`)

The drill library — the "Netflix" core of the app.

**Three tabs:**

### Handlz Drills (Official)
- Grid of drill cards created by PLAYR1/admin
- Each card shows: thumbnail image/video preview, drill title, category badge, difficulty badge, duration
- Click → opens drill detail page

### Community Drills
- User-submitted drills (public)
- Same card layout as Handlz drills
- Shows creator name

### My Drills
- Drills created by the logged-in user
- "Create Drill" button → opens drill creation form

**Filters (all tabs):**
- Search bar (title search)
- Difficulty dropdown: All / Beginner / Intermediate / Advanced / Elite
- Category dropdown: All / Shooting / Ball Handling / Passing / Conditioning / Workout / etc.

### Favorite Workouts Section
- Saved workout collections (sets of drills)
- Each workout shows drill count, estimated time
- "Start Workout" button → begins logging session

### Challenges Section (collapsible)
- List of active personal challenges
- Each challenge shows: name, category, goal, current progress bar, days remaining
- "Create Challenge" button → form with name, description, category, metric type, goal type, target, duration

### Drill Creation Form
Fields: Title, Description, Category, Difficulty, linked Video, linked PDF resource, thumbnail image upload, preset rounds (each round has shot location and metric values), custom metric values

---

## 6. DRILL DETAIL PAGE (`/drill/:id`)

Individual drill view.

**UI Elements:**
- Drill title, category badge, difficulty badge
- Video player (if video linked)
- PDF resource link (if linked)
- Full description
- Preset rounds listed (round number, location, metrics to hit)
- "Log This Drill" button → opens training log entry form pre-filled with this drill
- "Add to Workout" button
- Creator info
- Admin: Edit / Delete buttons

---

## 7. TRAINING LOG (`/log`)

Where players record completed training sessions.

**UI Elements:**

### Session Logging Form
- Drill selector (search/pick from library)
- Duration (minutes)
- Sets / Reps
- Score / Makes
- Shot location selector (visual half-court map or dropdown)
- Shots attempted / Shots made
- Notes text field
- Date/time (defaults to now)

### Shot Location Picker
Interactive half-court SVG. Click a zone to select it. Selected zone highlights in orange. Alternatively use dropdown list of locations.

### Bulk Save
Log multiple drills at once in a single session — add rows, fill each, submit all together as one workout session.

### Training Log History
List of past log entries, grouped by date:
- Each entry shows: drill name, duration, makes/attempts, notes
- Expandable to see full details
- Edit / Delete each entry

### Workout Session View
When entries share a session ID, they're grouped as a "workout session" with:
- Total duration
- Total drills
- Combined shooting stats
- Share button → opens Workout Share Card dialog

---

## 8. SHARE CARDS (Dialog overlays on Training Log and Career pages)

### Workout Share Dialog
Triggered from training log / progress page. Tabs for different card types:
- **Workout Card** — individual session: half-court shot chart, KPI row (duration, drills, makes, %), drill-by-drill breakdown with category color bars
- **Week Card** — 7-day summary: shot type breakdown bars (3PT/Mid/Layup/FT), daily activity bar chart, skills breakdown, half-court chart
- **Month Card** — 30-day version of above
- **Year Card** — annual version
- **Season Card** — per-game averages, shooting splits, season totals, best game spotlight

Platform selector: Instagram (1080×1080) / X-Twitter (1200×675) / Facebook (1200×630) / TikTok (1080×1920) / YouTube (1280×720)

Share buttons: "Share directly to [platform]" — on mobile opens native OS share sheet; on desktop downloads image + copies to clipboard + opens platform compose page

Copy Caption button — copies pre-written hashtag caption to clipboard
Download button — saves card as PNG at full resolution

### Game Share Card (`/career` → share game button)
Individual game stats card:
- Player name, jersey #, team
- W/L badge, score banner (your score vs opponent)
- Points (hero stat), REB/AST/STL/BLK
- Shooting splits bars: FG% / 3PT% / FT% with made/attempted
- Shot detail breakdown (FG, 3PT, FT, 2PT derived)
- Efficiency box: True Shooting %, FG%, 3PT/FT mini stats
- Same platform selector and share flow as above

---

## 9. VIDEOS PAGE (`/videos`)

Video library for training content.

**UI Elements:**
- Grid of video cards (thumbnail, title, description, category)
- Search and category filter
- Click → opens video player overlay
- Upload Video button → form with title, description, category, file upload to object storage
- Admin: manage/delete any video

---

## 10. CAREER PAGE (`/career`)

The game stats and player career tracking hub. This is the most feature-rich page.

**Main sections:**

### Career Profile Setup (onboarding within page)
Multi-step wizard for players who haven't set up career info:
- Basic info (name, DOB, grade, location)
- Team/school (team name, type, jersey number, positions)
- Card photo upload (used on share cards)

### Career Header
- Player photo (card photo)
- Name, jersey number
- Team name, school, positions
- Grade level, city/state
- Edit profile button

### Seasons
- Dropdown to switch between seasons or "Career" view
- "Add Season" button → dialog with season name, year, team, start month
- Each season has associated games

### Game Log
Table of all games for selected season:
- Date, Opponent, H/A, W/L, Score
- Stats columns: PTS, REB, AST, STL, BLK, FG, 3PT, FT
- Share button per game → opens Game Share Card
- Edit / Delete per game

### Add Game Form
Fields:
- Date
- Opponent name
- Home/Away toggle
- Win/Loss result
- Team score / Opponent score
- Minutes played
- Stats: Points, Rebounds, Assists, Steals, Blocks, Turnovers, Fouls
- Shooting: FG Made/Attempted, 3PT Made/Attempted, FT Made/Attempted

**Bulk Import** — upload CSV file with game stats for entire season

### Season Averages Panel
Auto-calculated from logged games:
- PPG, RPG, APG, SPG, BPG
- FG%, 3PT%, FT%
- Games played, Wins/Losses

### Trophy Room
Achievements earned based on milestones:
- First game logged, First win, Scoring milestones (10pt game, 20pt game, etc.)
- Shooting efficiency badges
- Each trophy has name, description, icon, unlock date

### Personal Records
Auto-tracked career bests:
- Most points in a game
- Best FG%, 3PT%, FT% in a game
- Most rebounds, assists, steals, blocks in a game

### Team Awards / Honors
Manual entry of awards received:
- Award name, team, year, description
- Add / Edit / Delete

### Share Season Card
Button on season view → opens Workout Share Dialog in "Season" tab mode

---

## 11. PROFILE PAGE (`/profile`)

Personal account settings and public profile management.

**Sections:**

### Account Info
- Update first name, last name
- Profile photo upload
- Email (display only)
- Change password form (current password, new password, confirm)

### Player Profile (public profile settings)
- Display name / handle
- Profile slug (sets URL: `playr1basketball.replit.app/player/[slug]`)
- Bio text
- Social links (Instagram, Twitter, TikTok, YouTube)
- Visibility toggle (public/private profile)

### Parent / Guardian
- Add parent email → sends invite email with link
- Shows connected parents
- Toggle: allow parent to see training data

### Notification Settings
- Push notification preferences
- Email notification preferences

### Connected Accounts
- Google Calendar connection status
- Connect/disconnect button

### Danger Zone
- Delete account option

---

## 12. FIND PEOPLE (`/find-people`)

Social discovery and connection system.

**UI Elements:**
- Search bar (search by name or username)
- Results list showing player/trainer cards
- Each card: avatar, name, role badge, team/school
- "Connect" button → sends connection request
- Pending requests section (accept/decline incoming)
- Active connections list

**Invite by link** — generate shareable invite link to connect

---

## 13. MY TRAINER (`/my-trainer`)

Player's view of their trainer relationship.

**UI Elements:**
- Connected trainer card: photo, name, bio, specialties
- Message trainer button → opens chat
- View trainer's public profile link
- Assigned drills from trainer (with completion status)
- Disconnect from trainer option
- "Find a Trainer" button → links to Finder

---

## 14. MY SESSIONS (`/my-sessions`)

Booking and managing training sessions with a trainer.

**UI Elements:**
- Calendar view of upcoming sessions
- Session cards: date, time, trainer name, session type (1-on-1/group), status badge
- Status badges: Pending / Confirmed / Completed / Cancelled / Rescheduled
- "Book Session" button → booking form
- Per-session actions: Reschedule, Cancel, Mark Complete
- Google Calendar sync button (syncs confirmed sessions to Google Calendar)

### Booking Form
- Select trainer (from connections)
- Session type: 1-on-1 or Group
- Date picker
- Time picker
- Duration
- Notes
- Price (auto-filled from trainer's rate)
- Stripe payment flow for paid sessions

---

## 15. MY EVALUATIONS (`/my-evaluations`)

Player's view of skill evaluations submitted by their trainer.

**UI Elements:**
- List of evaluation reports, newest first
- Each evaluation shows:
  - Date, trainer name
  - Skill attribute ratings (1-10 scale with colored bars)
  - Overall score
  - Trainer notes / comments
- Rating categories include: Ball Handling, Shooting, Passing, Defense, Athleticism, IQ, Leadership, etc. (configurable by admin)
- Radar/spider chart visualization of skill attributes

---

## 16. FEEDBACK PAGE (`/feedback`)

Public community forum for suggestions and bug reports.

**UI Elements:**
- Post list (newest first)
- Each post: title, body, category badge (Feature Request / Bug / General), upvote count, comment count, author, date
- "New Post" button → form with title, body, category
- Upvote button per post
- Click post → expands to show comments
- Comment form: text area + submit
- Admin: pin posts, delete posts/comments

---

## 17. TRAINER MODE (role-gated to trainer accounts)

### Trainer Dashboard (`/trainer`)
Overview for the trainer:
- Total players count
- Recent activity feed (who logged what)
- Quick stats: sessions this week, pending requests
- Shortcuts to key sections

### Roster (`/trainer/roster`)
List of all connected players:
- Player card: photo, name, team, grade, last active date
- Click → Player Detail view
- Invite player button → generates invite link
- Remove player button

### Player Detail (`/trainer/roster/:playerId`)
Trainer's detailed view of an individual player:
- Player profile summary
- Training log history (all their drill logs)
- Shot heatmap (their shooting zones)
- Progress charts (activity over time)
- Assigned drills section (assign new drills, see completion)
- Evaluation history for this player
- "Write Evaluation" button → opens evaluation form
- Message player button → opens chat

### Trainer Drills (`/trainer/drills`)
Two tabs:
- **Drill Library** — same as player drill library; trainers can create, edit, delete drills
- **Videos** — video library management; upload, edit, delete training videos

### Training Logs (`/trainer/logs`)
View all training logs across all rostered players:
- Filter by player
- Filter by date range
- Filter by drill category
- Aggregate stats view

### Chat (`/trainer/chat`)
Group and direct messaging:
- Player list sidebar (click to open DM thread)
- Group chat creation
- Message thread with timestamp, read receipts
- File/image attachments

### Progress (`/trainer/progress`)
Analytics across all players:
- Comparative charts (multiple players on same chart)
- Filter by player, time period, skill category
- Shooting heatmaps per player
- Activity consistency tracking

### Schedule (`/trainer/schedule`)
Trainer's session management:
- Calendar view of all booked sessions
- Session cards with player name, type, time, status
- Confirm / Reschedule / Cancel each session
- "Create Session Slot" — set availability for booking
- Group session creation (multiple players, one session)

### Evaluations (`/trainer/evaluations`)
All evaluations written by this trainer:
- List grouped by player
- "New Evaluation" button → opens form
- Evaluation form: select player, rate each skill attribute (1-10 sliders), write notes

### Trainer Profile (`/trainer/profile`)
Edit the trainer's public-facing profile:
- Profile photo upload
- Bio
- Specialties (multi-select: shooting coach, strength trainer, etc.)
- Certifications
- Years of experience
- Hourly rate / session rate
- Location (city, state)
- Social links
- Public profile URL preview

---

## 18. PUBLIC PROFILE PAGES (no login required)

### Player Public Profile (`/player/:slug`)
- Player photo, name, jersey number
- Team, school, positions, grade, location
- Career stats summary (season averages, career totals)
- Social links
- Training highlights (if shared)

### Trainer Public Profile (`/t/:id`)
- Trainer photo, name
- Bio, specialties, certifications
- Years of experience, rate
- Location
- "Connect" or "Book Session" button
- Reviews / ratings (if implemented)

### Team Profile (`/teams/:slug`)
- Team name, type (school/AAU/pro)
- Roster list (players on this team)
- Team stats aggregation

### League Profile (`/leagues/:slug`)
- League name, season
- Member teams
- Standings

---

## 19. FINDER / TEAMS / LEAGUES (`/finder` → redirects to `/teams`)

Discovery page for finding teams, leagues, and trainers:
- Search bar
- Filter by type, location
- Cards for each result with key info and link to their profile

---

## 20. PARENT DASHBOARD (`/parent-dashboard`)

Separate view for parents linked to a minor player's account.

**UI Elements:**
- Child selector (if linked to multiple children)
- Child's training summary (sessions, drills, time this week/month)
- Child's shot heatmap
- Recent drill log entries
- Achievement notifications
- Read-only — no editing capability

### Parent Invite Page (`/parent-invite/:code`)
- Landing page for parents who receive invite link
- Sign up or sign in
- Automatically links to child's account upon completion

---

## 21. ADMIN DASHBOARD (`/admin`) — Admin only

Full platform management. Six tabs:

### Users Tab
- Full user table: name, email, role, created date, last active
- Search and filter by role
- Click user → view their profile details
- Promote to admin / demote from admin
- Delete user
- Impersonate user (view app as them)

### Drills Tab
- Full drill library management
- Create, edit, delete any drill
- Toggle drill visibility (public/private)
- Assign drills to Handlz (official) library

### Resources Tab
Two sub-tabs:
- **Videos** — upload, edit, delete training videos; set title, description, category, thumbnail
- **PDFs** — upload, edit, delete PDF resources (playbooks, training guides); set title, description, category

### Analytics Tab
Platform-wide metrics dashboard:
- **KPI Cards:** Total Users, Active (7 days), Active (30 days), Training Logs, Sessions Booked, Connections, Feedback Posts
- **User Signups chart** — bar chart of new signups per week (last 12 weeks)
- **Training Logs chart** — line chart of logging activity per week (last 12 weeks)
- **Users by Role** — pie chart (Player / Trainer / Admin breakdown)
- **Drill Category Breakdown** — which categories are trained most
- **Top 10 Most-Used Drills** — ranked by times logged
- **Most Active Users** — top 10 by log count
- **Recent Signups** — last 10 new accounts
- **Sessions by Status** — pending/confirmed/completed/cancelled breakdown

### Shot Locations Tab
Manage the picklist of shot locations used in training logs:
- Table of all locations: label, slug, zone (inner paint / outer paint / mid-range / three-point / free throw)
- Add new location
- Edit label/zone
- Delete location
- Reorder

### Shot Types Tab
Manage shot type picklist:
- Table of shot types: label, slug
- Add / Edit / Delete

### Metric Templates Tab
Configure custom measurement templates used in drills:
- Template name, type (number/percentage/time/calculated)
- Unit label
- Add / Edit / Delete

---

## 22. PRIVACY / TERMS / SUPPORT (public pages)
Static informational pages at `/privacy`, `/terms`, `/support`

---

## DATA MODELS (key entities)

- **User** — auth, name, email, role (player/trainer/admin), Stripe IDs
- **UserProfile** — extended profile, isAdmin flag
- **PlayerProfile** — slug, bio, display name, social links, visibility
- **CareerProfile** — jersey #, team, positions, school, photo, grade, location
- **TrainingLog** — drill ID, user ID, duration, sets, reps, score, shot data, session ID, completed_at
- **WorkoutSession** — groups multiple training logs, title, date
- **Drill** — title, description, category, difficulty, video ID, PDF ID, preset rounds, creator
- **Game** — season ID, user ID, opponent, date, result, score, all box score stats
- **Season** — user ID, name, year, team, start month
- **TrainingSession** — trainer ID, player ID, date, time, type, status, price
- **PlayerTrainerConnection** — player ID, trainer ID, status (pending/accepted)
- **Achievement** — user ID, type, unlocked date
- **FeedbackPost** — user ID, title, body, category, upvotes
- **AnalyticsEvent** — user ID, event name, page, metadata, timestamp
- **ShotLocation / ShotType** — admin-managed picklists
- **MetricTemplate** — custom measurement definitions
- **ParentChild** — links parent user to child user
- **TrainerEvaluation** — trainer ID, player ID, attribute ratings, notes

---

## SHARING SYSTEM

### How it works
1. User clicks Share on any card (workout session, week/month/year summary, season, or individual game)
2. Dialog opens with platform selector tabs
3. Card renders at full resolution (e.g. 1080×1080 for Instagram) then scaled down for preview
4. html2canvas captures the rendered card as a PNG at full resolution

### On Mobile (iOS/Android)
Clicking a platform button triggers the native OS share sheet — user picks Instagram, TikTok, Messages, etc. directly from their phone.

### On Desktop
Clicking a platform button:
1. Downloads the PNG to the computer
2. Copies the image to the clipboard (Ctrl+V ready to paste)
3. Opens the platform's compose page (Twitter's tweet box, TikTok upload, Facebook, YouTube Studio)
4. Shows a toast with specific paste instructions per platform

### Card designs
All cards: true black background (#0a0a0a), PLAYR1 logo, orange left accent bar, no blue anywhere. Visuals include half-court SVGs, shooting percentage bars, activity bar charts, and stat grids.
