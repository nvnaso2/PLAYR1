# PLAYR1 — Product Requirements Document

**Product:** PLAYR1 — The Netflix for Basketball Training
**Document version:** 1.0
**Last updated:** April 17, 2026
**Status:** Live in production at `https://PLAYR1Basketball.replit.app`

---

## 1. Executive Summary

### 1.1 Vision
PLAYR1 is a comprehensive basketball training platform that gives players a complete, structured environment to develop their skills, track their growth, and connect with coaches and peers — modeled on the streaming-library experience of Netflix but built specifically around drill execution, performance tracking, and trainer collaboration.

### 1.2 Mission
Make professional-grade basketball development accessible to any player with a phone, while giving trainers and parents the tools to support, evaluate, and guide that development.

### 1.3 Core value proposition
- **For players:** A library of professional drills, a guided practice journal, visible progress over time, and a direct line to coaches.
- **For trainers:** A managed roster, drill assignment workflow, structured player evaluations, scheduled sessions, and a paid client management system.
- **For parents:** Visibility into a child's training without intruding on the player–coach relationship.
- **For the community:** Public profiles, shareable achievements, and a feedback loop into the product.

### 1.4 Platforms
- **Web app** — Responsive React/TypeScript single-page application.
- **iOS native app** — Capacitor-wrapped, distributed via App Store, loads from production URL with native push notifications and camera access.
- **Android native app** — Capacitor-configured (build pipeline ready).

---

## 2. User Personas & Roles

### 2.1 Player (primary)
A basketball player (typically middle-school through college, plus adult amateurs) who wants to improve specific skills, track practice consistency, and showcase development to coaches and recruiters.

### 2.2 Trainer / Coach
A basketball coach who manages a roster of players, prescribes workouts, evaluates performance, and books paid sessions.

### 2.3 Parent / Guardian
The parent of a minor player who wants visibility into the child's training activity, schedule, and evaluations without an active player account.

### 2.4 Admin
PLAYR1 staff who manage the global drill library, user accounts, content moderation, picklist values, and platform analytics.

### 2.5 Public visitor
Unauthenticated users browsing public player or trainer profiles, the marketing landing page, or shared achievement cards.

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

#### 3.1.1 Registration & login
- Email/password registration with email verification.
- Password hashing via `bcryptjs`.
- Stateless JWT authentication stored as an `httpOnly` cookie (`playr1_token`) on web; as a `Bearer` token in `localStorage` (`playr1_auth_token`) inside the iOS Capacitor app.
- "Login with Replit" SSO available (configured via `javascript_log_in_with_replit` integration).

#### 3.1.2 Password recovery
- "Forgot Password" flow sends a reset link via SendGrid.
- Time-limited single-use reset tokens.

#### 3.1.3 Onboarding wizard
On first login, new users complete:
- Role selection (Player / Trainer / Parent).
- Basic profile (name, avatar, location/zip code).
- Player-specific: grade, position, team affiliation, basketball goals.
- Trainer-specific: credentials, specialties, locations served.
- Parent-specific: invite or link to a child account.
- Avatar customization (skin tone, hair style via DiceBear).

#### 3.1.4 Account settings
- Profile editing, password change, email change, email-notification preferences, push-notification preferences, account deletion.

### 3.2 Drill Library

#### 3.2.1 Browse & search
- Searchable, filterable catalog of basketball drills, organized by category (shooting, ball-handling, passing, defense, conditioning, footwork, IQ).
- Each drill has: title, description, difficulty, duration estimate, required equipment, video tutorial, optional PDF guide, associated skill tags.

#### 3.2.2 Drill detail
- Embedded video player.
- Step-by-step instructions.
- "Start Drill" action that begins a guided training-log entry.
- Favorite / bookmark.

#### 3.2.3 User-generated drills
- Players and trainers can publish their own drills with uploaded videos.
- Trainer-published drills can be assigned to roster.
- Admins can promote user drills to the global library.

### 3.3 Training Log & Shot Tracking

#### 3.3.1 Session logging
- Player records every training session: drill performed, duration, sets, reps, perceived intensity (1–10), free-text notes.
- Sessions are timestamped (`completed_at`) for analytics.

#### 3.3.2 Shot tracking
- For shooting drills, players log makes / attempts.
- Shot **location** (e.g., corner three, left elbow, top of key, paint) and shot **type** (catch-and-shoot, off-the-dribble, free throw, layup) selected from admin-managed picklists.
- Locations are stored as half-court coordinates and rendered on a visual half-court chart.

#### 3.3.3 Bulk import
- CSV import for game stats from external sources (Hudl, MaxPreps): points, rebounds, assists, steals, blocks, FG/3PT/FT made/attempted, minutes.

### 3.4 Progress, Analytics & Visualization

#### 3.4.1 Dashboard
- At-a-glance summary: weekly training volume, current streak, recent achievements, daily challenge.

#### 3.4.2 Progress page
- **Stat cards** — totals for shots made/taken, drills completed, total minutes, weekly trend.
- **Shooting heatmap** — half-court visualization showing FG% by zone, color-graded.
- **Single configurable chart** — area chart with 11 selectable metrics (shots made, shots taken, threes, free throws, layups, mid-range, minutes, drills completed, FG%, 3PT%, mid-range%) and three time periods (weekly = last 7 days bucketed by day, monthly = current month bucketed by week, annual = Jan–Dec bucketed by month).
- **Empty state** for new users with CTAs to start a drill or log a session.

#### 3.4.3 Career page
- Lifetime stats, season-by-season breakdown, game log.
- XP and Level progression based on training activity.

#### 3.4.4 Trophy Room
- Achievements unlocked through milestones (first 100 makes, 7-day streak, 30-day streak, X drills completed in a category, etc.).
- Each trophy displays unlock date and is shareable.

### 3.5 Daily Streak Challenge
- A globally unique drill is generated **once per day** by GPT (via OpenAI integration) — every user worldwide sees the same drill that day.
- Players earn streak credit for completing the day's challenge.
- Streak history view shows past challenges and completion record.
- XP rewards scale with streak length.

### 3.6 Film Room (User Video Uploads)

#### 3.6.1 Upload
- Players upload videos of workouts or game film up to **4 GB** per file (client-side limit enforced).
- Two-step upload flow: request signed URL → direct upload to object storage → finalize.
- FFmpeg post-processing on the server: pass 1 attempts `-c:v copy -c:a aac -movflags +faststart`; pass 2 fallback re-encodes via `libx264` + `aac` for compatibility (fixes DaVinci Resolve LPCM audio that iOS can't play).

#### 3.6.2 Management
- Personal video library, set privacy (private / shared with trainer / public on profile).
- Trainer comment thread on shared videos.

### 3.7 Public Profiles & Discovery

#### 3.7.1 Player profile (`/player/:id`)
- Public-facing: bio, position, team, highlight videos, achievements, season stats, shareable link.
- Privacy controls: profile can be private, public, or visible only to connected trainers.

#### 3.7.2 Trainer profile (`/trainer/:id`)
- Bio, credentials, specialties, locations, hourly rate, availability, reviews, video samples, booking CTA.

#### 3.7.3 Finder
- Browse trainers and players by location (zip-code geocoding via the `zipcodes` package), skill, role, or name.

### 3.8 Trainer Mode

#### 3.8.1 Roster management
- View all assigned/connected players.
- Add players via universal invite system (link or email).
- Remove or archive players.

#### 3.8.2 Drill assignments
- Assign drills or workouts (sequenced drills) to individual players or groups.
- Set due dates and notes.
- Track completion in real time.

#### 3.8.3 Player evaluations
- Rate players on configurable skill attributes (IQ, athleticism, defense, shooting, ball-handling, leadership, etc.) on a 1–10 scale.
- Attribute set is admin-managed.
- Evaluations are versioned over time so a player can see growth trajectory.

#### 3.8.4 Group chat
- Create chat groups (e.g., team, training group) and message all members.

### 3.9 Bookings & Sessions

#### 3.9.1 Session booking
- Players browse a trainer's profile and request a session at a specific time/location.
- Trainer accepts, declines, or proposes alternative.
- Group sessions (multiple players, single trainer) supported.
- Reschedule and cancellation flows with policy enforcement.

#### 3.9.2 Google Calendar sync
- Trainers can connect Google Calendar (via `googleapis`).
- Confirmed sessions are pushed to the trainer's calendar; reschedules and cancellations propagate.

#### 3.9.3 Payment
- Stripe-powered checkout for one-time session payments and (future) recurring subscriptions.
- Integrated via the `stripe` Node SDK and `stripe-replit-sync` for DB synchronization.
- Payment confirmation triggers session-confirmation flow.

### 3.10 Communication

#### 3.10.1 Direct messaging
- 1:1 chat between connected users.
- Connections require an explicit request/accept handshake (universal connection system).

#### 3.10.2 Group chat
- Trainer-created groups for teams or training cohorts.

#### 3.10.3 Notifications
- **Email** — critical events (session confirmation, password reset, account changes) via SendGrid.
- **Web push** — VAPID-based push for browser users.
- **Native push** — APNs / FCM token registration for iOS / Android via Capacitor.
- **In-app notification center** showing unread events.

### 3.11 Parent / Guardian Mode

- Parent invites a minor child by email; child accepts or is invited via parent-created account.
- Parent dashboard shows the child's: recent training activity, evaluations, upcoming sessions, achievements.
- Optional **parent visibility toggle** that the player or trainer can adjust.
- Parents cannot log training, message non-connected users, or modify the child's account.

### 3.12 Feedback Forum
- Public-facing forum at `/feedback` for feature suggestions and bug reports.
- Users can submit, browse, **upvote**, and comment on entries.
- Admins triage and update status (planned, in-progress, shipped, declined).

### 3.13 Admin Dashboard

#### 3.13.1 Content management
- Drill library: create, edit, delete, categorize, attach videos and PDFs.
- Video library and PDF library (resources independent of drills).
- Picklists: shot locations (with court coordinates), shot types, evaluation attributes, metric templates.

#### 3.13.2 User management
- Search users, view profiles, grant/revoke admin, suspend accounts.
- Admin status verified via `storage.isUserAdmin(userId)` — never read from `users.role` directly.

#### 3.13.3 Analytics dashboard
- Platform metrics: DAU/WAU/MAU, sign-ups, session counts, drill popularity, completion rates, retention cohorts.

### 3.14 iOS Native App (Capacitor)

- Bundle ID: `com.playr1.training`, app name: "PLAYR1 Training".
- Loads from `https://PLAYR1Basketball.replit.app` (production server).
- Native splash: 500ms, dark background `#0a0a0a`, no spinner.
- Native push notifications (badge, sound, alert).
- Native camera access for Film Room recording.
- Status bar styled to match dark theme.
- Bearer-token auth (no cookies on iOS WebView).
- Safe-area insets respected throughout the UI.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Time-to-interactive on cold load:** target ≤ 2.5 s on a 4G connection.
- **Tab navigation:** ≤ 100 ms perceived latency (achieved via per-page chunk preloading on hover/touch + idle-time warm-up of common pages).
- **API response compression:** all responses > 1 KB are gzip/brotli compressed.
- **Static asset caching:** hashed JS/CSS/font assets served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` is `no-store` to prevent stale-bundle issues on iOS WebView.
- **Image optimization:** below-the-fold images use `loading="lazy"` and `decoding="async"`; hero images use `decoding="async"` + `fetchPriority="high"`.

### 4.2 Availability & Reliability
- **Health check endpoint:** `GET /api/health` returns `200 {status, uptimeSeconds, dbLatencyMs, dbReady, timestamp}` on success or `503` on failure. Used for uptime monitoring and post-deploy verification.
- **Database connection:** uses `@neondatabase/serverless` driver with WebSocket transport (required for Neon serverless Postgres which scales compute to zero on idle).
- **Pool configuration:** max 10 connections, 30 s idle timeout, 10 s connection timeout, error event handler attached.
- **Graceful degradation:** UI shows skeleton/empty states when data is unavailable rather than crashing.
- **Production isolation:** dev workspace and production deployment are fully isolated environments with separate databases.

### 4.3 Security
- **Authentication:** JWT with httpOnly + Secure + SameSite cookie on web; Bearer token in iOS Keychain-backed storage.
- **Authorization:** role checks server-side on every protected endpoint; admin status checked via `storage.isUserAdmin()`.
- **Rate limiting:**
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`): 20 requests / 15 minutes per IP.
  - All other API endpoints: 120 requests / minute per IP.
- **Input validation:** all request bodies validated with Zod schemas derived from `drizzle-zod`.
- **Password storage:** `bcryptjs` with appropriate work factor.
- **Object storage:** signed URLs for uploads; private files served only to authorized users via `getObjectUrl`.
- **CORS:** restricted to capacitor:// and ionic:// origins for native, same-origin for web.
- **Secrets management:** all credentials in environment variables; never committed.

### 4.4 Privacy
- Minor players' profiles default to private.
- Parent visibility is opt-in/opt-out per player.
- Public profile fields are explicitly chosen by the user.
- Account deletion removes personal data; aggregate analytics may persist anonymized.

### 4.5 Accessibility
- Color contrast meets WCAG AA on the dark theme.
- All interactive elements keyboard-navigable.
- Form inputs labeled; error messages associated via `aria-describedby`.
- Touch targets ≥ 44×44 pt on mobile.
- Dialogs include `DialogTitle` and `DialogDescription` (radix accessibility primitives).

### 4.6 Browser & Device Support
- **Browsers:** latest two major versions of Chrome, Safari, Firefox, Edge.
- **iOS:** 15.0+ (Capacitor 8 requirement).
- **Android:** API 23+ (Capacitor 8 requirement).
- **Mobile-first responsive design** with safe-area-inset handling.

### 4.7 Internationalization
- English only at launch. Architecture supports future i18n via React component-level string extraction.

### 4.8 Observability
- Structured request logging in production (`[express] METHOD path STATUS in Nms`).
- Error logging to deployment-log stream.
- Health endpoint for external monitor integration (UptimeRobot, BetterStack, etc.).

---

## 5. Data Model (high-level)

Stored in PostgreSQL via Drizzle ORM. Source of truth: `shared/schema.ts`.

| Domain | Key tables |
|---|---|
| Identity | `users`, `sessions`, `password_reset_tokens` |
| Profiles | `user_profiles`, `career_profiles`, `trainer_profiles`, `player_profiles`, `trainer_profile_locations`, `training_locations` |
| Connections | `player_trainer_connections`, `trainer_player_assignments`, `parent_child_relationships` |
| Teams | `team_clubs`, `leagues`, `trainer_teams`, `seasons`, `games` |
| Drills & Library | `drills`, `drill_metrics`, `drill_metric_templates`, `video_library`, `pdf_library`, `trainer_videos` |
| Training | `training_logs`, `training_log_metrics`, `metric_templates` |
| Shooting | `shot_locations`, `shot_types`, training-log shot rows |
| Challenges | `challenges`, daily challenge generation cache |
| Sessions | `training_sessions`, session-confirmation state |
| Messaging | `messages`, group/chat threads |
| Evaluations | `player_evaluations`, `evaluation_attributes` |
| Achievements | trophies / unlocked achievements |
| Feedback | `feedback`, `feedback_comments`, votes |
| Admin | admin flags, picklist tables |
| Push | `push_subscriptions`, native device tokens |

All schemas export: the table, an `insert` schema (`createInsertSchema(...).omit(...)`), an `Insert` type, and a `Select` type. Frontend and backend share this single source of truth via the `@shared` alias.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Frontend build | Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + zod resolver |
| UI components | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS, dark mode by default, orange (`#F97316`) primary |
| Icons | lucide-react, react-icons/si for brand logos |
| Backend | Node.js + Express |
| Database | PostgreSQL on Neon Serverless |
| ORM | Drizzle |
| Auth | bcryptjs + jsonwebtoken + cookie-parser |
| File storage | Replit App Storage (Google Cloud Storage backend) |
| Email | SendGrid |
| Push | web-push (VAPID) + native APNs/FCM via Capacitor |
| Payments | Stripe + stripe-replit-sync |
| Calendar | googleapis (Google Calendar) |
| AI | OpenAI via Replit AI Integrations (daily challenge generation) |
| Image generation | DiceBear (avatars) |
| Geocoding | `zipcodes` package |
| Mobile | Capacitor 8 (iOS + Android) |
| Video processing | ffmpeg |

### 6.2 Project structure
```
client/src/        — React frontend (pages, components, hooks, lib)
  pages/           — Route components
  components/      — Shared UI (sidebar, dialogs, charts, etc.)
  lib/
    pageLoaders.ts — Centralized lazy chunk loaders + preload helpers
    queryClient.ts — TanStack Query client + nativeFetch + getObjectUrl
shared/            — Code shared between client & server
  schema.ts        — Drizzle tables, Zod insert schemas, types
  models/          — Domain model exports
server/            — Express backend
  index.ts         — App bootstrap, middleware (compression, rate limit, CORS)
  routes.ts        — All API route definitions
  storage.ts       — IStorage interface + DB CRUD implementations
  db.ts            — Database pool + Drizzle instance
  auth.ts          — JWT + cookie auth
  static.ts        — Production static asset serving with cache headers
  replit_integrations/ — Object storage, auth, chat integrations
ios/               — Native iOS Capacitor project
docs/              — Documentation (this file)
```

### 6.3 API conventions
- All API routes are namespaced under `/api/`.
- Storage CRUD goes through the `IStorage` interface in `server/storage.ts`; routes stay thin.
- Request bodies validated against Zod schemas before reaching storage.
- Authenticated routes use `isAuthenticated` middleware which populates `req.user`.
- Admin routes additionally verify `storage.isUserAdmin(userId)`.

### 6.4 Critical implementation rules (developer-facing)
- All client-side `queryFn` and API calls must use `nativeFetch` from `@/lib/queryClient` — raw `fetch` breaks on iOS Capacitor.
- All image / video / avatar `src` attributes must go through `getObjectUrl` to resolve object-storage paths correctly on both web and native.
- Bulk-save routes must be declared **before** parameterized `:id` routes to avoid the wrong handler matching.
- New lazy pages must be registered in `client/src/lib/pageLoaders.ts` and added to the `routeToLoader` map for hover-preload to work.

### 6.5 Deployment & operations
- **Production:** Replit Deployment serving from `https://PLAYR1Basketball.replit.app` — fully isolated from the dev workspace, with its own database.
- **Publishing model:** code changes only reach production when the user explicitly clicks "Publish". Dev work has zero impact on live users.
- **Rollback:** previous deployments restorable from the Deployments tab.
- **Database migrations:** managed via `drizzle-kit push`. Never hand-write `ALTER TABLE` statements; never change primary-key column types.
- **Test accounts (production):**
  - `reviewer@playr1.app` / `Review2026!`
  - `nvnaso@outlook.com` / `Playr1Admin!`

---

## 7. Integrations

| Service | Purpose | How configured |
|---|---|---|
| Replit App Storage | Media uploads (videos, images, PDFs, avatars) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |
| SendGrid | Transactional email | `SENDGRID_API_KEY` |
| Stripe | Payments + subscriptions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Google OAuth | Calendar sync, future SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI (via Replit AI Integrations) | Daily challenge generation | Managed via integration |
| Replit Auth | "Login with Replit" | Managed via integration |

---

## 8. Out of Scope (current release)

- Live video streaming / real-time coaching sessions.
- In-app shot recognition from video (computer-vision drill scoring).
- Advanced recruiting marketplace (recruiter accounts, scholarship workflows).
- Tournament / league bracket management.
- Marketplace for trainer-published paid drill packs.
- Wearable / hardware integrations (motion sensors, smart-rims).
- Localization beyond English.

These are tracked in the feedback forum and may be planned for future releases.

---

## 9. Glossary

- **Drill** — A structured basketball exercise with instructions, video, and tracked metrics.
- **Training log** — A record of one completed drill or session, including stats.
- **Heatmap** — Visual half-court display of FG% by location.
- **Streak** — Consecutive days a player has completed the daily challenge.
- **Trophy** — An achievement unlocked by reaching a milestone.
- **Roster** — A trainer's collection of connected players.
- **Connection** — A mutually accepted relationship between two users (player/trainer, or peer/peer) that enables messaging.
- **Evaluation** — A trainer's structured rating of a player on configured skill attributes.
- **Career profile** — A player's lifetime stats and biographical information.
- **Film Room** — The user-uploaded video section of the app.

---

## 10. Acceptance Criteria — Production Readiness

A release is considered ready for production when all of the following pass:

- [ ] All affected routes return correct status codes for valid and invalid input.
- [ ] All forms validate input client-side and server-side.
- [ ] Health endpoint (`/api/health`) returns `200` with `dbReady: true`.
- [ ] No console errors on the dashboard, training-log, drills, or progress pages.
- [ ] iOS Capacitor build loads, authenticates, and fetches stats successfully.
- [ ] Push notifications deliver to a registered native device.
- [ ] Dark mode renders correctly on every page.
- [ ] Touch targets are ≥ 44×44 pt on mobile.
- [ ] Compression and long-cache headers are present on production responses.
- [ ] Deployment logs show no unhandled exceptions in the first 10 minutes after publish.

---

*End of document.*
# PLAYR1 — Product Requirements Document

**Product:** PLAYR1 — The Netflix for Basketball Training
**Document version:** 1.0
**Last updated:** April 17, 2026
**Status:** Live in production at `https://PLAYR1Basketball.replit.app`

---

## 1. Executive Summary

### 1.1 Vision
PLAYR1 is a comprehensive basketball training platform that gives players a complete, structured environment to develop their skills, track their growth, and connect with coaches and peers — modeled on the streaming-library experience of Netflix but built specifically around drill execution, performance tracking, and trainer collaboration.

### 1.2 Mission
Make professional-grade basketball development accessible to any player with a phone, while giving trainers and parents the tools to support, evaluate, and guide that development.

### 1.3 Core value proposition
- **For players:** A library of professional drills, a guided practice journal, visible progress over time, and a direct line to coaches.
- **For trainers:** A managed roster, drill assignment workflow, structured player evaluations, scheduled sessions, and a paid client management system.
- **For parents:** Visibility into a child's training without intruding on the player–coach relationship.
- **For the community:** Public profiles, shareable achievements, and a feedback loop into the product.

### 1.4 Platforms
- **Web app** — Responsive React/TypeScript single-page application.
- **iOS native app** — Capacitor-wrapped, distributed via App Store, loads from production URL with native push notifications and camera access.
- **Android native app** — Capacitor-configured (build pipeline ready).

---

## 2. User Personas & Roles

### 2.1 Player (primary)
A basketball player (typically middle-school through college, plus adult amateurs) who wants to improve specific skills, track practice consistency, and showcase development to coaches and recruiters.

### 2.2 Trainer / Coach
A basketball coach who manages a roster of players, prescribes workouts, evaluates performance, and books paid sessions.

### 2.3 Parent / Guardian
The parent of a minor player who wants visibility into the child's training activity, schedule, and evaluations without an active player account.

### 2.4 Admin
PLAYR1 staff who manage the global drill library, user accounts, content moderation, picklist values, and platform analytics.

### 2.5 Public visitor
Unauthenticated users browsing public player or trainer profiles, the marketing landing page, or shared achievement cards.

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

#### 3.1.1 Registration & login
- Email/password registration with email verification.
- Password hashing via `bcryptjs`.
- Stateless JWT authentication stored as an `httpOnly` cookie (`playr1_token`) on web; as a `Bearer` token in `localStorage` (`playr1_auth_token`) inside the iOS Capacitor app.
- "Login with Replit" SSO available (configured via `javascript_log_in_with_replit` integration).

#### 3.1.2 Password recovery
- "Forgot Password" flow sends a reset link via SendGrid.
- Time-limited single-use reset tokens.

#### 3.1.3 Onboarding wizard
On first login, new users complete:
- Role selection (Player / Trainer / Parent).
- Basic profile (name, avatar, location/zip code).
- Player-specific: grade, position, team affiliation, basketball goals.
- Trainer-specific: credentials, specialties, locations served.
- Parent-specific: invite or link to a child account.
- Avatar customization (skin tone, hair style via DiceBear).

#### 3.1.4 Account settings
- Profile editing, password change, email change, email-notification preferences, push-notification preferences, account deletion.

### 3.2 Drill Library

#### 3.2.1 Browse & search
- Searchable, filterable catalog of basketball drills, organized by category (shooting, ball-handling, passing, defense, conditioning, footwork, IQ).
- Each drill has: title, description, difficulty, duration estimate, required equipment, video tutorial, optional PDF guide, associated skill tags.

#### 3.2.2 Drill detail
- Embedded video player.
- Step-by-step instructions.
- "Start Drill" action that begins a guided training-log entry.
- Favorite / bookmark.

#### 3.2.3 User-generated drills
- Players and trainers can publish their own drills with uploaded videos.
- Trainer-published drills can be assigned to roster.
- Admins can promote user drills to the global library.

### 3.3 Training Log & Shot Tracking

#### 3.3.1 Session logging
- Player records every training session: drill performed, duration, sets, reps, perceived intensity (1–10), free-text notes.
- Sessions are timestamped (`completed_at`) for analytics.

#### 3.3.2 Shot tracking
- For shooting drills, players log makes / attempts.
- Shot **location** (e.g., corner three, left elbow, top of key, paint) and shot **type** (catch-and-shoot, off-the-dribble, free throw, layup) selected from admin-managed picklists.
- Locations are stored as half-court coordinates and rendered on a visual half-court chart.

#### 3.3.3 Bulk import
- CSV import for game stats from external sources (Hudl, MaxPreps): points, rebounds, assists, steals, blocks, FG/3PT/FT made/attempted, minutes.

### 3.4 Progress, Analytics & Visualization

#### 3.4.1 Dashboard
- At-a-glance summary: weekly training volume, current streak, recent achievements, daily challenge.

#### 3.4.2 Progress page
- **Stat cards** — totals for shots made/taken, drills completed, total minutes, weekly trend.
- **Shooting heatmap** — half-court visualization showing FG% by zone, color-graded.
- **Single configurable chart** — area chart with 11 selectable metrics (shots made, shots taken, threes, free throws, layups, mid-range, minutes, drills completed, FG%, 3PT%, mid-range%) and three time periods (weekly = last 7 days bucketed by day, monthly = current month bucketed by week, annual = Jan–Dec bucketed by month).
- **Empty state** for new users with CTAs to start a drill or log a session.

#### 3.4.3 Career page
- Lifetime stats, season-by-season breakdown, game log.
- XP and Level progression based on training activity.

#### 3.4.4 Trophy Room
- Achievements unlocked through milestones (first 100 makes, 7-day streak, 30-day streak, X drills completed in a category, etc.).
- Each trophy displays unlock date and is shareable.

### 3.5 Daily Streak Challenge
- A globally unique drill is generated **once per day** by GPT (via OpenAI integration) — every user worldwide sees the same drill that day.
- Players earn streak credit for completing the day's challenge.
- Streak history view shows past challenges and completion record.
- XP rewards scale with streak length.

### 3.6 Film Room (User Video Uploads)

#### 3.6.1 Upload
- Players upload videos of workouts or game film up to **4 GB** per file (client-side limit enforced).
- Two-step upload flow: request signed URL → direct upload to object storage → finalize.
- FFmpeg post-processing on the server: pass 1 attempts `-c:v copy -c:a aac -movflags +faststart`; pass 2 fallback re-encodes via `libx264` + `aac` for compatibility (fixes DaVinci Resolve LPCM audio that iOS can't play).

#### 3.6.2 Management
- Personal video library, set privacy (private / shared with trainer / public on profile).
- Trainer comment thread on shared videos.

### 3.7 Public Profiles & Discovery

#### 3.7.1 Player profile (`/player/:id`)
- Public-facing: bio, position, team, highlight videos, achievements, season stats, shareable link.
- Privacy controls: profile can be private, public, or visible only to connected trainers.

#### 3.7.2 Trainer profile (`/trainer/:id`)
- Bio, credentials, specialties, locations, hourly rate, availability, reviews, video samples, booking CTA.

#### 3.7.3 Finder
- Browse trainers and players by location (zip-code geocoding via the `zipcodes` package), skill, role, or name.

### 3.8 Trainer Mode

#### 3.8.1 Roster management
- View all assigned/connected players.
- Add players via universal invite system (link or email).
- Remove or archive players.

#### 3.8.2 Drill assignments
- Assign drills or workouts (sequenced drills) to individual players or groups.
- Set due dates and notes.
- Track completion in real time.

#### 3.8.3 Player evaluations
- Rate players on configurable skill attributes (IQ, athleticism, defense, shooting, ball-handling, leadership, etc.) on a 1–10 scale.
- Attribute set is admin-managed.
- Evaluations are versioned over time so a player can see growth trajectory.

#### 3.8.4 Group chat
- Create chat groups (e.g., team, training group) and message all members.

### 3.9 Bookings & Sessions

#### 3.9.1 Session booking
- Players browse a trainer's profile and request a session at a specific time/location.
- Trainer accepts, declines, or proposes alternative.
- Group sessions (multiple players, single trainer) supported.
- Reschedule and cancellation flows with policy enforcement.

#### 3.9.2 Google Calendar sync
- Trainers can connect Google Calendar (via `googleapis`).
- Confirmed sessions are pushed to the trainer's calendar; reschedules and cancellations propagate.

#### 3.9.3 Payment
- Stripe-powered checkout for one-time session payments and (future) recurring subscriptions.
- Integrated via the `stripe` Node SDK and `stripe-replit-sync` for DB synchronization.
- Payment confirmation triggers session-confirmation flow.

### 3.10 Communication

#### 3.10.1 Direct messaging
- 1:1 chat between connected users.
- Connections require an explicit request/accept handshake (universal connection system).

#### 3.10.2 Group chat
- Trainer-created groups for teams or training cohorts.

#### 3.10.3 Notifications
- **Email** — critical events (session confirmation, password reset, account changes) via SendGrid.
- **Web push** — VAPID-based push for browser users.
- **Native push** — APNs / FCM token registration for iOS / Android via Capacitor.
- **In-app notification center** showing unread events.

### 3.11 Parent / Guardian Mode

- Parent invites a minor child by email; child accepts or is invited via parent-created account.
- Parent dashboard shows the child's: recent training activity, evaluations, upcoming sessions, achievements.
- Optional **parent visibility toggle** that the player or trainer can adjust.
- Parents cannot log training, message non-connected users, or modify the child's account.

### 3.12 Feedback Forum
- Public-facing forum at `/feedback` for feature suggestions and bug reports.
- Users can submit, browse, **upvote**, and comment on entries.
- Admins triage and update status (planned, in-progress, shipped, declined).

### 3.13 Admin Dashboard

#### 3.13.1 Content management
- Drill library: create, edit, delete, categorize, attach videos and PDFs.
- Video library and PDF library (resources independent of drills).
- Picklists: shot locations (with court coordinates), shot types, evaluation attributes, metric templates.

#### 3.13.2 User management
- Search users, view profiles, grant/revoke admin, suspend accounts.
- Admin status verified via `storage.isUserAdmin(userId)` — never read from `users.role` directly.

#### 3.13.3 Analytics dashboard
- Platform metrics: DAU/WAU/MAU, sign-ups, session counts, drill popularity, completion rates, retention cohorts.

### 3.14 iOS Native App (Capacitor)

- Bundle ID: `com.playr1.training`, app name: "PLAYR1 Training".
- Loads from `https://PLAYR1Basketball.replit.app` (production server).
- Native splash: 500ms, dark background `#0a0a0a`, no spinner.
- Native push notifications (badge, sound, alert).
- Native camera access for Film Room recording.
- Status bar styled to match dark theme.
- Bearer-token auth (no cookies on iOS WebView).
- Safe-area insets respected throughout the UI.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Time-to-interactive on cold load:** target ≤ 2.5 s on a 4G connection.
- **Tab navigation:** ≤ 100 ms perceived latency (achieved via per-page chunk preloading on hover/touch + idle-time warm-up of common pages).
- **API response compression:** all responses > 1 KB are gzip/brotli compressed.
- **Static asset caching:** hashed JS/CSS/font assets served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` is `no-store` to prevent stale-bundle issues on iOS WebView.
- **Image optimization:** below-the-fold images use `loading="lazy"` and `decoding="async"`; hero images use `decoding="async"` + `fetchPriority="high"`.

### 4.2 Availability & Reliability
- **Health check endpoint:** `GET /api/health` returns `200 {status, uptimeSeconds, dbLatencyMs, dbReady, timestamp}` on success or `503` on failure. Used for uptime monitoring and post-deploy verification.
- **Database connection:** uses `@neondatabase/serverless` driver with WebSocket transport (required for Neon serverless Postgres which scales compute to zero on idle).
- **Pool configuration:** max 10 connections, 30 s idle timeout, 10 s connection timeout, error event handler attached.
- **Graceful degradation:** UI shows skeleton/empty states when data is unavailable rather than crashing.
- **Production isolation:** dev workspace and production deployment are fully isolated environments with separate databases.

### 4.3 Security
- **Authentication:** JWT with httpOnly + Secure + SameSite cookie on web; Bearer token in iOS Keychain-backed storage.
- **Authorization:** role checks server-side on every protected endpoint; admin status checked via `storage.isUserAdmin()`.
- **Rate limiting:**
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`): 20 requests / 15 minutes per IP.
  - All other API endpoints: 120 requests / minute per IP.
- **Input validation:** all request bodies validated with Zod schemas derived from `drizzle-zod`.
- **Password storage:** `bcryptjs` with appropriate work factor.
- **Object storage:** signed URLs for uploads; private files served only to authorized users via `getObjectUrl`.
- **CORS:** restricted to capacitor:// and ionic:// origins for native, same-origin for web.
- **Secrets management:** all credentials in environment variables; never committed.

### 4.4 Privacy
- Minor players' profiles default to private.
- Parent visibility is opt-in/opt-out per player.
- Public profile fields are explicitly chosen by the user.
- Account deletion removes personal data; aggregate analytics may persist anonymized.

### 4.5 Accessibility
- Color contrast meets WCAG AA on the dark theme.
- All interactive elements keyboard-navigable.
- Form inputs labeled; error messages associated via `aria-describedby`.
- Touch targets ≥ 44×44 pt on mobile.
- Dialogs include `DialogTitle` and `DialogDescription` (radix accessibility primitives).

### 4.6 Browser & Device Support
- **Browsers:** latest two major versions of Chrome, Safari, Firefox, Edge.
- **iOS:** 15.0+ (Capacitor 8 requirement).
- **Android:** API 23+ (Capacitor 8 requirement).
- **Mobile-first responsive design** with safe-area-inset handling.

### 4.7 Internationalization
- English only at launch. Architecture supports future i18n via React component-level string extraction.

### 4.8 Observability
- Structured request logging in production (`[express] METHOD path STATUS in Nms`).
- Error logging to deployment-log stream.
- Health endpoint for external monitor integration (UptimeRobot, BetterStack, etc.).

---

## 5. Data Model (high-level)

Stored in PostgreSQL via Drizzle ORM. Source of truth: `shared/schema.ts`.

| Domain | Key tables |
|---|---|
| Identity | `users`, `sessions`, `password_reset_tokens` |
| Profiles | `user_profiles`, `career_profiles`, `trainer_profiles`, `player_profiles`, `trainer_profile_locations`, `training_locations` |
| Connections | `player_trainer_connections`, `trainer_player_assignments`, `parent_child_relationships` |
| Teams | `team_clubs`, `leagues`, `trainer_teams`, `seasons`, `games` |
| Drills & Library | `drills`, `drill_metrics`, `drill_metric_templates`, `video_library`, `pdf_library`, `trainer_videos` |
| Training | `training_logs`, `training_log_metrics`, `metric_templates` |
| Shooting | `shot_locations`, `shot_types`, training-log shot rows |
| Challenges | `challenges`, daily challenge generation cache |
| Sessions | `training_sessions`, session-confirmation state |
| Messaging | `messages`, group/chat threads |
| Evaluations | `player_evaluations`, `evaluation_attributes` |
| Achievements | trophies / unlocked achievements |
| Feedback | `feedback`, `feedback_comments`, votes |
| Admin | admin flags, picklist tables |
| Push | `push_subscriptions`, native device tokens |

All schemas export: the table, an `insert` schema (`createInsertSchema(...).omit(...)`), an `Insert` type, and a `Select` type. Frontend and backend share this single source of truth via the `@shared` alias.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Frontend build | Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + zod resolver |
| UI components | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS, dark mode by default, orange (`#F97316`) primary |
| Icons | lucide-react, react-icons/si for brand logos |
| Backend | Node.js + Express |
| Database | PostgreSQL on Neon Serverless |
| ORM | Drizzle |
| Auth | bcryptjs + jsonwebtoken + cookie-parser |
| File storage | Replit App Storage (Google Cloud Storage backend) |
| Email | SendGrid |
| Push | web-push (VAPID) + native APNs/FCM via Capacitor |
| Payments | Stripe + stripe-replit-sync |
| Calendar | googleapis (Google Calendar) |
| AI | OpenAI via Replit AI Integrations (daily challenge generation) |
| Image generation | DiceBear (avatars) |
| Geocoding | `zipcodes` package |
| Mobile | Capacitor 8 (iOS + Android) |
| Video processing | ffmpeg |

### 6.2 Project structure
```
client/src/        — React frontend (pages, components, hooks, lib)
  pages/           — Route components
  components/      — Shared UI (sidebar, dialogs, charts, etc.)
  lib/
    pageLoaders.ts — Centralized lazy chunk loaders + preload helpers
    queryClient.ts — TanStack Query client + nativeFetch + getObjectUrl
shared/            — Code shared between client & server
  schema.ts        — Drizzle tables, Zod insert schemas, types
  models/          — Domain model exports
server/            — Express backend
  index.ts         — App bootstrap, middleware (compression, rate limit, CORS)
  routes.ts        — All API route definitions
  storage.ts       — IStorage interface + DB CRUD implementations
  db.ts            — Database pool + Drizzle instance
  auth.ts          — JWT + cookie auth
  static.ts        — Production static asset serving with cache headers
  replit_integrations/ — Object storage, auth, chat integrations
ios/               — Native iOS Capacitor project
docs/              — Documentation (this file)
```

### 6.3 API conventions
- All API routes are namespaced under `/api/`.
- Storage CRUD goes through the `IStorage` interface in `server/storage.ts`; routes stay thin.
- Request bodies validated against Zod schemas before reaching storage.
- Authenticated routes use `isAuthenticated` middleware which populates `req.user`.
- Admin routes additionally verify `storage.isUserAdmin(userId)`.

### 6.4 Critical implementation rules (developer-facing)
- All client-side `queryFn` and API calls must use `nativeFetch` from `@/lib/queryClient` — raw `fetch` breaks on iOS Capacitor.
- All image / video / avatar `src` attributes must go through `getObjectUrl` to resolve object-storage paths correctly on both web and native.
- Bulk-save routes must be declared **before** parameterized `:id` routes to avoid the wrong handler matching.
- New lazy pages must be registered in `client/src/lib/pageLoaders.ts` and added to the `routeToLoader` map for hover-preload to work.

### 6.5 Deployment & operations
- **Production:** Replit Deployment serving from `https://PLAYR1Basketball.replit.app` — fully isolated from the dev workspace, with its own database.
- **Publishing model:** code changes only reach production when the user explicitly clicks "Publish". Dev work has zero impact on live users.
- **Rollback:** previous deployments restorable from the Deployments tab.
- **Database migrations:** managed via `drizzle-kit push`. Never hand-write `ALTER TABLE` statements; never change primary-key column types.
- **Test accounts (production):**
  - `reviewer@playr1.app` / `Review2026!`
  - `nvnaso@outlook.com` / `Playr1Admin!`

---

## 7. Integrations

| Service | Purpose | How configured |
|---|---|---|
| Replit App Storage | Media uploads (videos, images, PDFs, avatars) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |
| SendGrid | Transactional email | `SENDGRID_API_KEY` |
| Stripe | Payments + subscriptions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Google OAuth | Calendar sync, future SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI (via Replit AI Integrations) | Daily challenge generation | Managed via integration |
| Replit Auth | "Login with Replit" | Managed via integration |

---

## 8. Out of Scope (current release)

- Live video streaming / real-time coaching sessions.
- In-app shot recognition from video (computer-vision drill scoring).
- Advanced recruiting marketplace (recruiter accounts, scholarship workflows).
- Tournament / league bracket management.
- Marketplace for trainer-published paid drill packs.
- Wearable / hardware integrations (motion sensors, smart-rims).
- Localization beyond English.

These are tracked in the feedback forum and may be planned for future releases.

---

## 9. Glossary

- **Drill** — A structured basketball exercise with instructions, video, and tracked metrics.
- **Training log** — A record of one completed drill or session, including stats.
- **Heatmap** — Visual half-court display of FG% by location.
- **Streak** — Consecutive days a player has completed the daily challenge.
- **Trophy** — An achievement unlocked by reaching a milestone.
- **Roster** — A trainer's collection of connected players.
- **Connection** — A mutually accepted relationship between two users (player/trainer, or peer/peer) that enables messaging.
- **Evaluation** — A trainer's structured rating of a player on configured skill attributes.
- **Career profile** — A player's lifetime stats and biographical information.
- **Film Room** — The user-uploaded video section of the app.

---

## 10. Acceptance Criteria — Production Readiness

A release is considered ready for production when all of the following pass:

- [ ] All affected routes return correct status codes for valid and invalid input.
- [ ] All forms validate input client-side and server-side.
- [ ] Health endpoint (`/api/health`) returns `200` with `dbReady: true`.
- [ ] No console errors on the dashboard, training-log, drills, or progress pages.
- [ ] iOS Capacitor build loads, authenticates, and fetches stats successfully.
- [ ] Push notifications deliver to a registered native device.
- [ ] Dark mode renders correctly on every page.
- [ ] Touch targets are ≥ 44×44 pt on mobile.
- [ ] Compression and long-cache headers are present on production responses.
- [ ] Deployment logs show no unhandled exceptions in the first 10 minutes after publish.

---

*End of document.*
# PLAYR1 — Product Requirements Document

**Product:** PLAYR1 — The Netflix for Basketball Training
**Document version:** 1.0
**Last updated:** April 17, 2026
**Status:** Live in production at `https://PLAYR1Basketball.replit.app`

---

## 1. Executive Summary

### 1.1 Vision
PLAYR1 is a comprehensive basketball training platform that gives players a complete, structured environment to develop their skills, track their growth, and connect with coaches and peers — modeled on the streaming-library experience of Netflix but built specifically around drill execution, performance tracking, and trainer collaboration.

### 1.2 Mission
Make professional-grade basketball development accessible to any player with a phone, while giving trainers and parents the tools to support, evaluate, and guide that development.

### 1.3 Core value proposition
- **For players:** A library of professional drills, a guided practice journal, visible progress over time, and a direct line to coaches.
- **For trainers:** A managed roster, drill assignment workflow, structured player evaluations, scheduled sessions, and a paid client management system.
- **For parents:** Visibility into a child's training without intruding on the player–coach relationship.
- **For the community:** Public profiles, shareable achievements, and a feedback loop into the product.

### 1.4 Platforms
- **Web app** — Responsive React/TypeScript single-page application.
- **iOS native app** — Capacitor-wrapped, distributed via App Store, loads from production URL with native push notifications and camera access.
- **Android native app** — Capacitor-configured (build pipeline ready).

---

## 2. User Personas & Roles

### 2.1 Player (primary)
A basketball player (typically middle-school through college, plus adult amateurs) who wants to improve specific skills, track practice consistency, and showcase development to coaches and recruiters.

### 2.2 Trainer / Coach
A basketball coach who manages a roster of players, prescribes workouts, evaluates performance, and books paid sessions.

### 2.3 Parent / Guardian
The parent of a minor player who wants visibility into the child's training activity, schedule, and evaluations without an active player account.

### 2.4 Admin
PLAYR1 staff who manage the global drill library, user accounts, content moderation, picklist values, and platform analytics.

### 2.5 Public visitor
Unauthenticated users browsing public player or trainer profiles, the marketing landing page, or shared achievement cards.

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

#### 3.1.1 Registration & login
- Email/password registration with email verification.
- Password hashing via `bcryptjs`.
- Stateless JWT authentication stored as an `httpOnly` cookie (`playr1_token`) on web; as a `Bearer` token in `localStorage` (`playr1_auth_token`) inside the iOS Capacitor app.
- "Login with Replit" SSO available (configured via `javascript_log_in_with_replit` integration).

#### 3.1.2 Password recovery
- "Forgot Password" flow sends a reset link via SendGrid.
- Time-limited single-use reset tokens.

#### 3.1.3 Onboarding wizard
On first login, new users complete:
- Role selection (Player / Trainer / Parent).
- Basic profile (name, avatar, location/zip code).
- Player-specific: grade, position, team affiliation, basketball goals.
- Trainer-specific: credentials, specialties, locations served.
- Parent-specific: invite or link to a child account.
- Avatar customization (skin tone, hair style via DiceBear).

#### 3.1.4 Account settings
- Profile editing, password change, email change, email-notification preferences, push-notification preferences, account deletion.

### 3.2 Drill Library

#### 3.2.1 Browse & search
- Searchable, filterable catalog of basketball drills, organized by category (shooting, ball-handling, passing, defense, conditioning, footwork, IQ).
- Each drill has: title, description, difficulty, duration estimate, required equipment, video tutorial, optional PDF guide, associated skill tags.

#### 3.2.2 Drill detail
- Embedded video player.
- Step-by-step instructions.
- "Start Drill" action that begins a guided training-log entry.
- Favorite / bookmark.

#### 3.2.3 User-generated drills
- Players and trainers can publish their own drills with uploaded videos.
- Trainer-published drills can be assigned to roster.
- Admins can promote user drills to the global library.

### 3.3 Training Log & Shot Tracking

#### 3.3.1 Session logging
- Player records every training session: drill performed, duration, sets, reps, perceived intensity (1–10), free-text notes.
- Sessions are timestamped (`completed_at`) for analytics.

#### 3.3.2 Shot tracking
- For shooting drills, players log makes / attempts.
- Shot **location** (e.g., corner three, left elbow, top of key, paint) and shot **type** (catch-and-shoot, off-the-dribble, free throw, layup) selected from admin-managed picklists.
- Locations are stored as half-court coordinates and rendered on a visual half-court chart.

#### 3.3.3 Bulk import
- CSV import for game stats from external sources (Hudl, MaxPreps): points, rebounds, assists, steals, blocks, FG/3PT/FT made/attempted, minutes.

### 3.4 Progress, Analytics & Visualization

#### 3.4.1 Dashboard
- At-a-glance summary: weekly training volume, current streak, recent achievements, daily challenge.

#### 3.4.2 Progress page
- **Stat cards** — totals for shots made/taken, drills completed, total minutes, weekly trend.
- **Shooting heatmap** — half-court visualization showing FG% by zone, color-graded.
- **Single configurable chart** — area chart with 11 selectable metrics (shots made, shots taken, threes, free throws, layups, mid-range, minutes, drills completed, FG%, 3PT%, mid-range%) and three time periods (weekly = last 7 days bucketed by day, monthly = current month bucketed by week, annual = Jan–Dec bucketed by month).
- **Empty state** for new users with CTAs to start a drill or log a session.

#### 3.4.3 Career page
- Lifetime stats, season-by-season breakdown, game log.
- XP and Level progression based on training activity.

#### 3.4.4 Trophy Room
- Achievements unlocked through milestones (first 100 makes, 7-day streak, 30-day streak, X drills completed in a category, etc.).
- Each trophy displays unlock date and is shareable.

### 3.5 Daily Streak Challenge
- A globally unique drill is generated **once per day** by GPT (via OpenAI integration) — every user worldwide sees the same drill that day.
- Players earn streak credit for completing the day's challenge.
- Streak history view shows past challenges and completion record.
- XP rewards scale with streak length.

### 3.6 Film Room (User Video Uploads)

#### 3.6.1 Upload
- Players upload videos of workouts or game film up to **4 GB** per file (client-side limit enforced).
- Two-step upload flow: request signed URL → direct upload to object storage → finalize.
- FFmpeg post-processing on the server: pass 1 attempts `-c:v copy -c:a aac -movflags +faststart`; pass 2 fallback re-encodes via `libx264` + `aac` for compatibility (fixes DaVinci Resolve LPCM audio that iOS can't play).

#### 3.6.2 Management
- Personal video library, set privacy (private / shared with trainer / public on profile).
- Trainer comment thread on shared videos.

### 3.7 Public Profiles & Discovery

#### 3.7.1 Player profile (`/player/:id`)
- Public-facing: bio, position, team, highlight videos, achievements, season stats, shareable link.
- Privacy controls: profile can be private, public, or visible only to connected trainers.

#### 3.7.2 Trainer profile (`/trainer/:id`)
- Bio, credentials, specialties, locations, hourly rate, availability, reviews, video samples, booking CTA.

#### 3.7.3 Finder
- Browse trainers and players by location (zip-code geocoding via the `zipcodes` package), skill, role, or name.

### 3.8 Trainer Mode

#### 3.8.1 Roster management
- View all assigned/connected players.
- Add players via universal invite system (link or email).
- Remove or archive players.

#### 3.8.2 Drill assignments
- Assign drills or workouts (sequenced drills) to individual players or groups.
- Set due dates and notes.
- Track completion in real time.

#### 3.8.3 Player evaluations
- Rate players on configurable skill attributes (IQ, athleticism, defense, shooting, ball-handling, leadership, etc.) on a 1–10 scale.
- Attribute set is admin-managed.
- Evaluations are versioned over time so a player can see growth trajectory.

#### 3.8.4 Group chat
- Create chat groups (e.g., team, training group) and message all members.

### 3.9 Bookings & Sessions

#### 3.9.1 Session booking
- Players browse a trainer's profile and request a session at a specific time/location.
- Trainer accepts, declines, or proposes alternative.
- Group sessions (multiple players, single trainer) supported.
- Reschedule and cancellation flows with policy enforcement.

#### 3.9.2 Google Calendar sync
- Trainers can connect Google Calendar (via `googleapis`).
- Confirmed sessions are pushed to the trainer's calendar; reschedules and cancellations propagate.

#### 3.9.3 Payment
- Stripe-powered checkout for one-time session payments and (future) recurring subscriptions.
- Integrated via the `stripe` Node SDK and `stripe-replit-sync` for DB synchronization.
- Payment confirmation triggers session-confirmation flow.

### 3.10 Communication

#### 3.10.1 Direct messaging
- 1:1 chat between connected users.
- Connections require an explicit request/accept handshake (universal connection system).

#### 3.10.2 Group chat
- Trainer-created groups for teams or training cohorts.

#### 3.10.3 Notifications
- **Email** — critical events (session confirmation, password reset, account changes) via SendGrid.
- **Web push** — VAPID-based push for browser users.
- **Native push** — APNs / FCM token registration for iOS / Android via Capacitor.
- **In-app notification center** showing unread events.

### 3.11 Parent / Guardian Mode

- Parent invites a minor child by email; child accepts or is invited via parent-created account.
- Parent dashboard shows the child's: recent training activity, evaluations, upcoming sessions, achievements.
- Optional **parent visibility toggle** that the player or trainer can adjust.
- Parents cannot log training, message non-connected users, or modify the child's account.

### 3.12 Feedback Forum
- Public-facing forum at `/feedback` for feature suggestions and bug reports.
- Users can submit, browse, **upvote**, and comment on entries.
- Admins triage and update status (planned, in-progress, shipped, declined).

### 3.13 Admin Dashboard

#### 3.13.1 Content management
- Drill library: create, edit, delete, categorize, attach videos and PDFs.
- Video library and PDF library (resources independent of drills).
- Picklists: shot locations (with court coordinates), shot types, evaluation attributes, metric templates.

#### 3.13.2 User management
- Search users, view profiles, grant/revoke admin, suspend accounts.
- Admin status verified via `storage.isUserAdmin(userId)` — never read from `users.role` directly.

#### 3.13.3 Analytics dashboard
- Platform metrics: DAU/WAU/MAU, sign-ups, session counts, drill popularity, completion rates, retention cohorts.

### 3.14 iOS Native App (Capacitor)

- Bundle ID: `com.playr1.training`, app name: "PLAYR1 Training".
- Loads from `https://PLAYR1Basketball.replit.app` (production server).
- Native splash: 500ms, dark background `#0a0a0a`, no spinner.
- Native push notifications (badge, sound, alert).
- Native camera access for Film Room recording.
- Status bar styled to match dark theme.
- Bearer-token auth (no cookies on iOS WebView).
- Safe-area insets respected throughout the UI.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Time-to-interactive on cold load:** target ≤ 2.5 s on a 4G connection.
- **Tab navigation:** ≤ 100 ms perceived latency (achieved via per-page chunk preloading on hover/touch + idle-time warm-up of common pages).
- **API response compression:** all responses > 1 KB are gzip/brotli compressed.
- **Static asset caching:** hashed JS/CSS/font assets served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` is `no-store` to prevent stale-bundle issues on iOS WebView.
- **Image optimization:** below-the-fold images use `loading="lazy"` and `decoding="async"`; hero images use `decoding="async"` + `fetchPriority="high"`.

### 4.2 Availability & Reliability
- **Health check endpoint:** `GET /api/health` returns `200 {status, uptimeSeconds, dbLatencyMs, dbReady, timestamp}` on success or `503` on failure. Used for uptime monitoring and post-deploy verification.
- **Database connection:** uses `@neondatabase/serverless` driver with WebSocket transport (required for Neon serverless Postgres which scales compute to zero on idle).
- **Pool configuration:** max 10 connections, 30 s idle timeout, 10 s connection timeout, error event handler attached.
- **Graceful degradation:** UI shows skeleton/empty states when data is unavailable rather than crashing.
- **Production isolation:** dev workspace and production deployment are fully isolated environments with separate databases.

### 4.3 Security
- **Authentication:** JWT with httpOnly + Secure + SameSite cookie on web; Bearer token in iOS Keychain-backed storage.
- **Authorization:** role checks server-side on every protected endpoint; admin status checked via `storage.isUserAdmin()`.
- **Rate limiting:**
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`): 20 requests / 15 minutes per IP.
  - All other API endpoints: 120 requests / minute per IP.
- **Input validation:** all request bodies validated with Zod schemas derived from `drizzle-zod`.
- **Password storage:** `bcryptjs` with appropriate work factor.
- **Object storage:** signed URLs for uploads; private files served only to authorized users via `getObjectUrl`.
- **CORS:** restricted to capacitor:// and ionic:// origins for native, same-origin for web.
- **Secrets management:** all credentials in environment variables; never committed.

### 4.4 Privacy
- Minor players' profiles default to private.
- Parent visibility is opt-in/opt-out per player.
- Public profile fields are explicitly chosen by the user.
- Account deletion removes personal data; aggregate analytics may persist anonymized.

### 4.5 Accessibility
- Color contrast meets WCAG AA on the dark theme.
- All interactive elements keyboard-navigable.
- Form inputs labeled; error messages associated via `aria-describedby`.
- Touch targets ≥ 44×44 pt on mobile.
- Dialogs include `DialogTitle` and `DialogDescription` (radix accessibility primitives).

### 4.6 Browser & Device Support
- **Browsers:** latest two major versions of Chrome, Safari, Firefox, Edge.
- **iOS:** 15.0+ (Capacitor 8 requirement).
- **Android:** API 23+ (Capacitor 8 requirement).
- **Mobile-first responsive design** with safe-area-inset handling.

### 4.7 Internationalization
- English only at launch. Architecture supports future i18n via React component-level string extraction.

### 4.8 Observability
- Structured request logging in production (`[express] METHOD path STATUS in Nms`).
- Error logging to deployment-log stream.
- Health endpoint for external monitor integration (UptimeRobot, BetterStack, etc.).

---

## 5. Data Model (high-level)

Stored in PostgreSQL via Drizzle ORM. Source of truth: `shared/schema.ts`.

| Domain | Key tables |
|---|---|
| Identity | `users`, `sessions`, `password_reset_tokens` |
| Profiles | `user_profiles`, `career_profiles`, `trainer_profiles`, `player_profiles`, `trainer_profile_locations`, `training_locations` |
| Connections | `player_trainer_connections`, `trainer_player_assignments`, `parent_child_relationships` |
| Teams | `team_clubs`, `leagues`, `trainer_teams`, `seasons`, `games` |
| Drills & Library | `drills`, `drill_metrics`, `drill_metric_templates`, `video_library`, `pdf_library`, `trainer_videos` |
| Training | `training_logs`, `training_log_metrics`, `metric_templates` |
| Shooting | `shot_locations`, `shot_types`, training-log shot rows |
| Challenges | `challenges`, daily challenge generation cache |
| Sessions | `training_sessions`, session-confirmation state |
| Messaging | `messages`, group/chat threads |
| Evaluations | `player_evaluations`, `evaluation_attributes` |
| Achievements | trophies / unlocked achievements |
| Feedback | `feedback`, `feedback_comments`, votes |
| Admin | admin flags, picklist tables |
| Push | `push_subscriptions`, native device tokens |

All schemas export: the table, an `insert` schema (`createInsertSchema(...).omit(...)`), an `Insert` type, and a `Select` type. Frontend and backend share this single source of truth via the `@shared` alias.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Frontend build | Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + zod resolver |
| UI components | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS, dark mode by default, orange (`#F97316`) primary |
| Icons | lucide-react, react-icons/si for brand logos |
| Backend | Node.js + Express |
| Database | PostgreSQL on Neon Serverless |
| ORM | Drizzle |
| Auth | bcryptjs + jsonwebtoken + cookie-parser |
| File storage | Replit App Storage (Google Cloud Storage backend) |
| Email | SendGrid |
| Push | web-push (VAPID) + native APNs/FCM via Capacitor |
| Payments | Stripe + stripe-replit-sync |
| Calendar | googleapis (Google Calendar) |
| AI | OpenAI via Replit AI Integrations (daily challenge generation) |
| Image generation | DiceBear (avatars) |
| Geocoding | `zipcodes` package |
| Mobile | Capacitor 8 (iOS + Android) |
| Video processing | ffmpeg |

### 6.2 Project structure
```
client/src/        — React frontend (pages, components, hooks, lib)
  pages/           — Route components
  components/      — Shared UI (sidebar, dialogs, charts, etc.)
  lib/
    pageLoaders.ts — Centralized lazy chunk loaders + preload helpers
    queryClient.ts — TanStack Query client + nativeFetch + getObjectUrl
shared/            — Code shared between client & server
  schema.ts        — Drizzle tables, Zod insert schemas, types
  models/          — Domain model exports
server/            — Express backend
  index.ts         — App bootstrap, middleware (compression, rate limit, CORS)
  routes.ts        — All API route definitions
  storage.ts       — IStorage interface + DB CRUD implementations
  db.ts            — Database pool + Drizzle instance
  auth.ts          — JWT + cookie auth
  static.ts        — Production static asset serving with cache headers
  replit_integrations/ — Object storage, auth, chat integrations
ios/               — Native iOS Capacitor project
docs/              — Documentation (this file)
```

### 6.3 API conventions
- All API routes are namespaced under `/api/`.
- Storage CRUD goes through the `IStorage` interface in `server/storage.ts`; routes stay thin.
- Request bodies validated against Zod schemas before reaching storage.
- Authenticated routes use `isAuthenticated` middleware which populates `req.user`.
- Admin routes additionally verify `storage.isUserAdmin(userId)`.

### 6.4 Critical implementation rules (developer-facing)
- All client-side `queryFn` and API calls must use `nativeFetch` from `@/lib/queryClient` — raw `fetch` breaks on iOS Capacitor.
- All image / video / avatar `src` attributes must go through `getObjectUrl` to resolve object-storage paths correctly on both web and native.
- Bulk-save routes must be declared **before** parameterized `:id` routes to avoid the wrong handler matching.
- New lazy pages must be registered in `client/src/lib/pageLoaders.ts` and added to the `routeToLoader` map for hover-preload to work.

### 6.5 Deployment & operations
- **Production:** Replit Deployment serving from `https://PLAYR1Basketball.replit.app` — fully isolated from the dev workspace, with its own database.
- **Publishing model:** code changes only reach production when the user explicitly clicks "Publish". Dev work has zero impact on live users.
- **Rollback:** previous deployments restorable from the Deployments tab.
- **Database migrations:** managed via `drizzle-kit push`. Never hand-write `ALTER TABLE` statements; never change primary-key column types.
- **Test accounts (production):**
  - `reviewer@playr1.app` / `Review2026!`
  - `nvnaso@outlook.com` / `Playr1Admin!`

---

## 7. Integrations

| Service | Purpose | How configured |
|---|---|---|
| Replit App Storage | Media uploads (videos, images, PDFs, avatars) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |
| SendGrid | Transactional email | `SENDGRID_API_KEY` |
| Stripe | Payments + subscriptions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Google OAuth | Calendar sync, future SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI (via Replit AI Integrations) | Daily challenge generation | Managed via integration |
| Replit Auth | "Login with Replit" | Managed via integration |

---

## 8. Out of Scope (current release)

- Live video streaming / real-time coaching sessions.
- In-app shot recognition from video (computer-vision drill scoring).
- Advanced recruiting marketplace (recruiter accounts, scholarship workflows).
- Tournament / league bracket management.
- Marketplace for trainer-published paid drill packs.
- Wearable / hardware integrations (motion sensors, smart-rims).
- Localization beyond English.

These are tracked in the feedback forum and may be planned for future releases.

---

## 9. Glossary

- **Drill** — A structured basketball exercise with instructions, video, and tracked metrics.
- **Training log** — A record of one completed drill or session, including stats.
- **Heatmap** — Visual half-court display of FG% by location.
- **Streak** — Consecutive days a player has completed the daily challenge.
- **Trophy** — An achievement unlocked by reaching a milestone.
- **Roster** — A trainer's collection of connected players.
- **Connection** — A mutually accepted relationship between two users (player/trainer, or peer/peer) that enables messaging.
- **Evaluation** — A trainer's structured rating of a player on configured skill attributes.
- **Career profile** — A player's lifetime stats and biographical information.
- **Film Room** — The user-uploaded video section of the app.

---

## 10. Acceptance Criteria — Production Readiness

A release is considered ready for production when all of the following pass:

- [ ] All affected routes return correct status codes for valid and invalid input.
- [ ] All forms validate input client-side and server-side.
- [ ] Health endpoint (`/api/health`) returns `200` with `dbReady: true`.
- [ ] No console errors on the dashboard, training-log, drills, or progress pages.
- [ ] iOS Capacitor build loads, authenticates, and fetches stats successfully.
- [ ] Push notifications deliver to a registered native device.
- [ ] Dark mode renders correctly on every page.
- [ ] Touch targets are ≥ 44×44 pt on mobile.
- [ ] Compression and long-cache headers are present on production responses.
- [ ] Deployment logs show no unhandled exceptions in the first 10 minutes after publish.

---

*End of document.*
# PLAYR1 — Product Requirements Document

**Product:** PLAYR1 — The Netflix for Basketball Training
**Document version:** 1.0
**Last updated:** April 17, 2026
**Status:** Live in production at `https://PLAYR1Basketball.replit.app`

---

## 1. Executive Summary

### 1.1 Vision
PLAYR1 is a comprehensive basketball training platform that gives players a complete, structured environment to develop their skills, track their growth, and connect with coaches and peers — modeled on the streaming-library experience of Netflix but built specifically around drill execution, performance tracking, and trainer collaboration.

### 1.2 Mission
Make professional-grade basketball development accessible to any player with a phone, while giving trainers and parents the tools to support, evaluate, and guide that development.

### 1.3 Core value proposition
- **For players:** A library of professional drills, a guided practice journal, visible progress over time, and a direct line to coaches.
- **For trainers:** A managed roster, drill assignment workflow, structured player evaluations, scheduled sessions, and a paid client management system.
- **For parents:** Visibility into a child's training without intruding on the player–coach relationship.
- **For the community:** Public profiles, shareable achievements, and a feedback loop into the product.

### 1.4 Platforms
- **Web app** — Responsive React/TypeScript single-page application.
- **iOS native app** — Capacitor-wrapped, distributed via App Store, loads from production URL with native push notifications and camera access.
- **Android native app** — Capacitor-configured (build pipeline ready).

---

## 2. User Personas & Roles

### 2.1 Player (primary)
A basketball player (typically middle-school through college, plus adult amateurs) who wants to improve specific skills, track practice consistency, and showcase development to coaches and recruiters.

### 2.2 Trainer / Coach
A basketball coach who manages a roster of players, prescribes workouts, evaluates performance, and books paid sessions.

### 2.3 Parent / Guardian
The parent of a minor player who wants visibility into the child's training activity, schedule, and evaluations without an active player account.

### 2.4 Admin
PLAYR1 staff who manage the global drill library, user accounts, content moderation, picklist values, and platform analytics.

### 2.5 Public visitor
Unauthenticated users browsing public player or trainer profiles, the marketing landing page, or shared achievement cards.

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

#### 3.1.1 Registration & login
- Email/password registration with email verification.
- Password hashing via `bcryptjs`.
- Stateless JWT authentication stored as an `httpOnly` cookie (`playr1_token`) on web; as a `Bearer` token in `localStorage` (`playr1_auth_token`) inside the iOS Capacitor app.
- "Login with Replit" SSO available (configured via `javascript_log_in_with_replit` integration).

#### 3.1.2 Password recovery
- "Forgot Password" flow sends a reset link via SendGrid.
- Time-limited single-use reset tokens.

#### 3.1.3 Onboarding wizard
On first login, new users complete:
- Role selection (Player / Trainer / Parent).
- Basic profile (name, avatar, location/zip code).
- Player-specific: grade, position, team affiliation, basketball goals.
- Trainer-specific: credentials, specialties, locations served.
- Parent-specific: invite or link to a child account.
- Avatar customization (skin tone, hair style via DiceBear).

#### 3.1.4 Account settings
- Profile editing, password change, email change, email-notification preferences, push-notification preferences, account deletion.

### 3.2 Drill Library

#### 3.2.1 Browse & search
- Searchable, filterable catalog of basketball drills, organized by category (shooting, ball-handling, passing, defense, conditioning, footwork, IQ).
- Each drill has: title, description, difficulty, duration estimate, required equipment, video tutorial, optional PDF guide, associated skill tags.

#### 3.2.2 Drill detail
- Embedded video player.
- Step-by-step instructions.
- "Start Drill" action that begins a guided training-log entry.
- Favorite / bookmark.

#### 3.2.3 User-generated drills
- Players and trainers can publish their own drills with uploaded videos.
- Trainer-published drills can be assigned to roster.
- Admins can promote user drills to the global library.

### 3.3 Training Log & Shot Tracking

#### 3.3.1 Session logging
- Player records every training session: drill performed, duration, sets, reps, perceived intensity (1–10), free-text notes.
- Sessions are timestamped (`completed_at`) for analytics.

#### 3.3.2 Shot tracking
- For shooting drills, players log makes / attempts.
- Shot **location** (e.g., corner three, left elbow, top of key, paint) and shot **type** (catch-and-shoot, off-the-dribble, free throw, layup) selected from admin-managed picklists.
- Locations are stored as half-court coordinates and rendered on a visual half-court chart.

#### 3.3.3 Bulk import
- CSV import for game stats from external sources (Hudl, MaxPreps): points, rebounds, assists, steals, blocks, FG/3PT/FT made/attempted, minutes.

### 3.4 Progress, Analytics & Visualization

#### 3.4.1 Dashboard
- At-a-glance summary: weekly training volume, current streak, recent achievements, daily challenge.

#### 3.4.2 Progress page
- **Stat cards** — totals for shots made/taken, drills completed, total minutes, weekly trend.
- **Shooting heatmap** — half-court visualization showing FG% by zone, color-graded.
- **Single configurable chart** — area chart with 11 selectable metrics (shots made, shots taken, threes, free throws, layups, mid-range, minutes, drills completed, FG%, 3PT%, mid-range%) and three time periods (weekly = last 7 days bucketed by day, monthly = current month bucketed by week, annual = Jan–Dec bucketed by month).
- **Empty state** for new users with CTAs to start a drill or log a session.

#### 3.4.3 Career page
- Lifetime stats, season-by-season breakdown, game log.
- XP and Level progression based on training activity.

#### 3.4.4 Trophy Room
- Achievements unlocked through milestones (first 100 makes, 7-day streak, 30-day streak, X drills completed in a category, etc.).
- Each trophy displays unlock date and is shareable.

### 3.5 Daily Streak Challenge
- A globally unique drill is generated **once per day** by GPT (via OpenAI integration) — every user worldwide sees the same drill that day.
- Players earn streak credit for completing the day's challenge.
- Streak history view shows past challenges and completion record.
- XP rewards scale with streak length.

### 3.6 Film Room (User Video Uploads)

#### 3.6.1 Upload
- Players upload videos of workouts or game film up to **4 GB** per file (client-side limit enforced).
- Two-step upload flow: request signed URL → direct upload to object storage → finalize.
- FFmpeg post-processing on the server: pass 1 attempts `-c:v copy -c:a aac -movflags +faststart`; pass 2 fallback re-encodes via `libx264` + `aac` for compatibility (fixes DaVinci Resolve LPCM audio that iOS can't play).

#### 3.6.2 Management
- Personal video library, set privacy (private / shared with trainer / public on profile).
- Trainer comment thread on shared videos.

### 3.7 Public Profiles & Discovery

#### 3.7.1 Player profile (`/player/:id`)
- Public-facing: bio, position, team, highlight videos, achievements, season stats, shareable link.
- Privacy controls: profile can be private, public, or visible only to connected trainers.

#### 3.7.2 Trainer profile (`/trainer/:id`)
- Bio, credentials, specialties, locations, hourly rate, availability, reviews, video samples, booking CTA.

#### 3.7.3 Finder
- Browse trainers and players by location (zip-code geocoding via the `zipcodes` package), skill, role, or name.

### 3.8 Trainer Mode

#### 3.8.1 Roster management
- View all assigned/connected players.
- Add players via universal invite system (link or email).
- Remove or archive players.

#### 3.8.2 Drill assignments
- Assign drills or workouts (sequenced drills) to individual players or groups.
- Set due dates and notes.
- Track completion in real time.

#### 3.8.3 Player evaluations
- Rate players on configurable skill attributes (IQ, athleticism, defense, shooting, ball-handling, leadership, etc.) on a 1–10 scale.
- Attribute set is admin-managed.
- Evaluations are versioned over time so a player can see growth trajectory.

#### 3.8.4 Group chat
- Create chat groups (e.g., team, training group) and message all members.

### 3.9 Bookings & Sessions

#### 3.9.1 Session booking
- Players browse a trainer's profile and request a session at a specific time/location.
- Trainer accepts, declines, or proposes alternative.
- Group sessions (multiple players, single trainer) supported.
- Reschedule and cancellation flows with policy enforcement.

#### 3.9.2 Google Calendar sync
- Trainers can connect Google Calendar (via `googleapis`).
- Confirmed sessions are pushed to the trainer's calendar; reschedules and cancellations propagate.

#### 3.9.3 Payment
- Stripe-powered checkout for one-time session payments and (future) recurring subscriptions.
- Integrated via the `stripe` Node SDK and `stripe-replit-sync` for DB synchronization.
- Payment confirmation triggers session-confirmation flow.

### 3.10 Communication

#### 3.10.1 Direct messaging
- 1:1 chat between connected users.
- Connections require an explicit request/accept handshake (universal connection system).

#### 3.10.2 Group chat
- Trainer-created groups for teams or training cohorts.

#### 3.10.3 Notifications
- **Email** — critical events (session confirmation, password reset, account changes) via SendGrid.
- **Web push** — VAPID-based push for browser users.
- **Native push** — APNs / FCM token registration for iOS / Android via Capacitor.
- **In-app notification center** showing unread events.

### 3.11 Parent / Guardian Mode

- Parent invites a minor child by email; child accepts or is invited via parent-created account.
- Parent dashboard shows the child's: recent training activity, evaluations, upcoming sessions, achievements.
- Optional **parent visibility toggle** that the player or trainer can adjust.
- Parents cannot log training, message non-connected users, or modify the child's account.

### 3.12 Feedback Forum
- Public-facing forum at `/feedback` for feature suggestions and bug reports.
- Users can submit, browse, **upvote**, and comment on entries.
- Admins triage and update status (planned, in-progress, shipped, declined).

### 3.13 Admin Dashboard

#### 3.13.1 Content management
- Drill library: create, edit, delete, categorize, attach videos and PDFs.
- Video library and PDF library (resources independent of drills).
- Picklists: shot locations (with court coordinates), shot types, evaluation attributes, metric templates.

#### 3.13.2 User management
- Search users, view profiles, grant/revoke admin, suspend accounts.
- Admin status verified via `storage.isUserAdmin(userId)` — never read from `users.role` directly.

#### 3.13.3 Analytics dashboard
- Platform metrics: DAU/WAU/MAU, sign-ups, session counts, drill popularity, completion rates, retention cohorts.

### 3.14 iOS Native App (Capacitor)

- Bundle ID: `com.playr1.training`, app name: "PLAYR1 Training".
- Loads from `https://PLAYR1Basketball.replit.app` (production server).
- Native splash: 500ms, dark background `#0a0a0a`, no spinner.
- Native push notifications (badge, sound, alert).
- Native camera access for Film Room recording.
- Status bar styled to match dark theme.
- Bearer-token auth (no cookies on iOS WebView).
- Safe-area insets respected throughout the UI.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Time-to-interactive on cold load:** target ≤ 2.5 s on a 4G connection.
- **Tab navigation:** ≤ 100 ms perceived latency (achieved via per-page chunk preloading on hover/touch + idle-time warm-up of common pages).
- **API response compression:** all responses > 1 KB are gzip/brotli compressed.
- **Static asset caching:** hashed JS/CSS/font assets served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` is `no-store` to prevent stale-bundle issues on iOS WebView.
- **Image optimization:** below-the-fold images use `loading="lazy"` and `decoding="async"`; hero images use `decoding="async"` + `fetchPriority="high"`.

### 4.2 Availability & Reliability
- **Health check endpoint:** `GET /api/health` returns `200 {status, uptimeSeconds, dbLatencyMs, dbReady, timestamp}` on success or `503` on failure. Used for uptime monitoring and post-deploy verification.
- **Database connection:** uses `@neondatabase/serverless` driver with WebSocket transport (required for Neon serverless Postgres which scales compute to zero on idle).
- **Pool configuration:** max 10 connections, 30 s idle timeout, 10 s connection timeout, error event handler attached.
- **Graceful degradation:** UI shows skeleton/empty states when data is unavailable rather than crashing.
- **Production isolation:** dev workspace and production deployment are fully isolated environments with separate databases.

### 4.3 Security
- **Authentication:** JWT with httpOnly + Secure + SameSite cookie on web; Bearer token in iOS Keychain-backed storage.
- **Authorization:** role checks server-side on every protected endpoint; admin status checked via `storage.isUserAdmin()`.
- **Rate limiting:**
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`): 20 requests / 15 minutes per IP.
  - All other API endpoints: 120 requests / minute per IP.
- **Input validation:** all request bodies validated with Zod schemas derived from `drizzle-zod`.
- **Password storage:** `bcryptjs` with appropriate work factor.
- **Object storage:** signed URLs for uploads; private files served only to authorized users via `getObjectUrl`.
- **CORS:** restricted to capacitor:// and ionic:// origins for native, same-origin for web.
- **Secrets management:** all credentials in environment variables; never committed.

### 4.4 Privacy
- Minor players' profiles default to private.
- Parent visibility is opt-in/opt-out per player.
- Public profile fields are explicitly chosen by the user.
- Account deletion removes personal data; aggregate analytics may persist anonymized.

### 4.5 Accessibility
- Color contrast meets WCAG AA on the dark theme.
- All interactive elements keyboard-navigable.
- Form inputs labeled; error messages associated via `aria-describedby`.
- Touch targets ≥ 44×44 pt on mobile.
- Dialogs include `DialogTitle` and `DialogDescription` (radix accessibility primitives).

### 4.6 Browser & Device Support
- **Browsers:** latest two major versions of Chrome, Safari, Firefox, Edge.
- **iOS:** 15.0+ (Capacitor 8 requirement).
- **Android:** API 23+ (Capacitor 8 requirement).
- **Mobile-first responsive design** with safe-area-inset handling.

### 4.7 Internationalization
- English only at launch. Architecture supports future i18n via React component-level string extraction.

### 4.8 Observability
- Structured request logging in production (`[express] METHOD path STATUS in Nms`).
- Error logging to deployment-log stream.
- Health endpoint for external monitor integration (UptimeRobot, BetterStack, etc.).

---

## 5. Data Model (high-level)

Stored in PostgreSQL via Drizzle ORM. Source of truth: `shared/schema.ts`.

| Domain | Key tables |
|---|---|
| Identity | `users`, `sessions`, `password_reset_tokens` |
| Profiles | `user_profiles`, `career_profiles`, `trainer_profiles`, `player_profiles`, `trainer_profile_locations`, `training_locations` |
| Connections | `player_trainer_connections`, `trainer_player_assignments`, `parent_child_relationships` |
| Teams | `team_clubs`, `leagues`, `trainer_teams`, `seasons`, `games` |
| Drills & Library | `drills`, `drill_metrics`, `drill_metric_templates`, `video_library`, `pdf_library`, `trainer_videos` |
| Training | `training_logs`, `training_log_metrics`, `metric_templates` |
| Shooting | `shot_locations`, `shot_types`, training-log shot rows |
| Challenges | `challenges`, daily challenge generation cache |
| Sessions | `training_sessions`, session-confirmation state |
| Messaging | `messages`, group/chat threads |
| Evaluations | `player_evaluations`, `evaluation_attributes` |
| Achievements | trophies / unlocked achievements |
| Feedback | `feedback`, `feedback_comments`, votes |
| Admin | admin flags, picklist tables |
| Push | `push_subscriptions`, native device tokens |

All schemas export: the table, an `insert` schema (`createInsertSchema(...).omit(...)`), an `Insert` type, and a `Select` type. Frontend and backend share this single source of truth via the `@shared` alias.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Frontend build | Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + zod resolver |
| UI components | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS, dark mode by default, orange (`#F97316`) primary |
| Icons | lucide-react, react-icons/si for brand logos |
| Backend | Node.js + Express |
| Database | PostgreSQL on Neon Serverless |
| ORM | Drizzle |
| Auth | bcryptjs + jsonwebtoken + cookie-parser |
| File storage | Replit App Storage (Google Cloud Storage backend) |
| Email | SendGrid |
| Push | web-push (VAPID) + native APNs/FCM via Capacitor |
| Payments | Stripe + stripe-replit-sync |
| Calendar | googleapis (Google Calendar) |
| AI | OpenAI via Replit AI Integrations (daily challenge generation) |
| Image generation | DiceBear (avatars) |
| Geocoding | `zipcodes` package |
| Mobile | Capacitor 8 (iOS + Android) |
| Video processing | ffmpeg |

### 6.2 Project structure
```
client/src/        — React frontend (pages, components, hooks, lib)
  pages/           — Route components
  components/      — Shared UI (sidebar, dialogs, charts, etc.)
  lib/
    pageLoaders.ts — Centralized lazy chunk loaders + preload helpers
    queryClient.ts — TanStack Query client + nativeFetch + getObjectUrl
shared/            — Code shared between client & server
  schema.ts        — Drizzle tables, Zod insert schemas, types
  models/          — Domain model exports
server/            — Express backend
  index.ts         — App bootstrap, middleware (compression, rate limit, CORS)
  routes.ts        — All API route definitions
  storage.ts       — IStorage interface + DB CRUD implementations
  db.ts            — Database pool + Drizzle instance
  auth.ts          — JWT + cookie auth
  static.ts        — Production static asset serving with cache headers
  replit_integrations/ — Object storage, auth, chat integrations
ios/               — Native iOS Capacitor project
docs/              — Documentation (this file)
```

### 6.3 API conventions
- All API routes are namespaced under `/api/`.
- Storage CRUD goes through the `IStorage` interface in `server/storage.ts`; routes stay thin.
- Request bodies validated against Zod schemas before reaching storage.
- Authenticated routes use `isAuthenticated` middleware which populates `req.user`.
- Admin routes additionally verify `storage.isUserAdmin(userId)`.

### 6.4 Critical implementation rules (developer-facing)
- All client-side `queryFn` and API calls must use `nativeFetch` from `@/lib/queryClient` — raw `fetch` breaks on iOS Capacitor.
- All image / video / avatar `src` attributes must go through `getObjectUrl` to resolve object-storage paths correctly on both web and native.
- Bulk-save routes must be declared **before** parameterized `:id` routes to avoid the wrong handler matching.
- New lazy pages must be registered in `client/src/lib/pageLoaders.ts` and added to the `routeToLoader` map for hover-preload to work.

### 6.5 Deployment & operations
- **Production:** Replit Deployment serving from `https://PLAYR1Basketball.replit.app` — fully isolated from the dev workspace, with its own database.
- **Publishing model:** code changes only reach production when the user explicitly clicks "Publish". Dev work has zero impact on live users.
- **Rollback:** previous deployments restorable from the Deployments tab.
- **Database migrations:** managed via `drizzle-kit push`. Never hand-write `ALTER TABLE` statements; never change primary-key column types.
- **Test accounts (production):**
  - `reviewer@playr1.app` / `Review2026!`
  - `nvnaso@outlook.com` / `Playr1Admin!`

---

## 7. Integrations

| Service | Purpose | How configured |
|---|---|---|
| Replit App Storage | Media uploads (videos, images, PDFs, avatars) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |
| SendGrid | Transactional email | `SENDGRID_API_KEY` |
| Stripe | Payments + subscriptions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Google OAuth | Calendar sync, future SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI (via Replit AI Integrations) | Daily challenge generation | Managed via integration |
| Replit Auth | "Login with Replit" | Managed via integration |

---

## 8. Out of Scope (current release)

- Live video streaming / real-time coaching sessions.
- In-app shot recognition from video (computer-vision drill scoring).
- Advanced recruiting marketplace (recruiter accounts, scholarship workflows).
- Tournament / league bracket management.
- Marketplace for trainer-published paid drill packs.
- Wearable / hardware integrations (motion sensors, smart-rims).
- Localization beyond English.

These are tracked in the feedback forum and may be planned for future releases.

---

## 9. Glossary

- **Drill** — A structured basketball exercise with instructions, video, and tracked metrics.
- **Training log** — A record of one completed drill or session, including stats.
- **Heatmap** — Visual half-court display of FG% by location.
- **Streak** — Consecutive days a player has completed the daily challenge.
- **Trophy** — An achievement unlocked by reaching a milestone.
- **Roster** — A trainer's collection of connected players.
- **Connection** — A mutually accepted relationship between two users (player/trainer, or peer/peer) that enables messaging.
- **Evaluation** — A trainer's structured rating of a player on configured skill attributes.
- **Career profile** — A player's lifetime stats and biographical information.
- **Film Room** — The user-uploaded video section of the app.

---

## 10. Acceptance Criteria — Production Readiness

A release is considered ready for production when all of the following pass:

- [ ] All affected routes return correct status codes for valid and invalid input.
- [ ] All forms validate input client-side and server-side.
- [ ] Health endpoint (`/api/health`) returns `200` with `dbReady: true`.
- [ ] No console errors on the dashboard, training-log, drills, or progress pages.
- [ ] iOS Capacitor build loads, authenticates, and fetches stats successfully.
- [ ] Push notifications deliver to a registered native device.
- [ ] Dark mode renders correctly on every page.
- [ ] Touch targets are ≥ 44×44 pt on mobile.
- [ ] Compression and long-cache headers are present on production responses.
- [ ] Deployment logs show no unhandled exceptions in the first 10 minutes after publish.

---

*End of document.*
# PLAYR1 — Product Requirements Document

**Product:** PLAYR1 — The Netflix for Basketball Training
**Document version:** 1.0
**Last updated:** April 17, 2026
**Status:** Live in production at `https://PLAYR1Basketball.replit.app`

---

## 1. Executive Summary

### 1.1 Vision
PLAYR1 is a comprehensive basketball training platform that gives players a complete, structured environment to develop their skills, track their growth, and connect with coaches and peers — modeled on the streaming-library experience of Netflix but built specifically around drill execution, performance tracking, and trainer collaboration.

### 1.2 Mission
Make professional-grade basketball development accessible to any player with a phone, while giving trainers and parents the tools to support, evaluate, and guide that development.

### 1.3 Core value proposition
- **For players:** A library of professional drills, a guided practice journal, visible progress over time, and a direct line to coaches.
- **For trainers:** A managed roster, drill assignment workflow, structured player evaluations, scheduled sessions, and a paid client management system.
- **For parents:** Visibility into a child's training without intruding on the player–coach relationship.
- **For the community:** Public profiles, shareable achievements, and a feedback loop into the product.

### 1.4 Platforms
- **Web app** — Responsive React/TypeScript single-page application.
- **iOS native app** — Capacitor-wrapped, distributed via App Store, loads from production URL with native push notifications and camera access.
- **Android native app** — Capacitor-configured (build pipeline ready).

---

## 2. User Personas & Roles

### 2.1 Player (primary)
A basketball player (typically middle-school through college, plus adult amateurs) who wants to improve specific skills, track practice consistency, and showcase development to coaches and recruiters.

### 2.2 Trainer / Coach
A basketball coach who manages a roster of players, prescribes workouts, evaluates performance, and books paid sessions.

### 2.3 Parent / Guardian
The parent of a minor player who wants visibility into the child's training activity, schedule, and evaluations without an active player account.

### 2.4 Admin
PLAYR1 staff who manage the global drill library, user accounts, content moderation, picklist values, and platform analytics.

### 2.5 Public visitor
Unauthenticated users browsing public player or trainer profiles, the marketing landing page, or shared achievement cards.

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

#### 3.1.1 Registration & login
- Email/password registration with email verification.
- Password hashing via `bcryptjs`.
- Stateless JWT authentication stored as an `httpOnly` cookie (`playr1_token`) on web; as a `Bearer` token in `localStorage` (`playr1_auth_token`) inside the iOS Capacitor app.
- "Login with Replit" SSO available (configured via `javascript_log_in_with_replit` integration).

#### 3.1.2 Password recovery
- "Forgot Password" flow sends a reset link via SendGrid.
- Time-limited single-use reset tokens.

#### 3.1.3 Onboarding wizard
On first login, new users complete:
- Role selection (Player / Trainer / Parent).
- Basic profile (name, avatar, location/zip code).
- Player-specific: grade, position, team affiliation, basketball goals.
- Trainer-specific: credentials, specialties, locations served.
- Parent-specific: invite or link to a child account.
- Avatar customization (skin tone, hair style via DiceBear).

#### 3.1.4 Account settings
- Profile editing, password change, email change, email-notification preferences, push-notification preferences, account deletion.

### 3.2 Drill Library

#### 3.2.1 Browse & search
- Searchable, filterable catalog of basketball drills, organized by category (shooting, ball-handling, passing, defense, conditioning, footwork, IQ).
- Each drill has: title, description, difficulty, duration estimate, required equipment, video tutorial, optional PDF guide, associated skill tags.

#### 3.2.2 Drill detail
- Embedded video player.
- Step-by-step instructions.
- "Start Drill" action that begins a guided training-log entry.
- Favorite / bookmark.

#### 3.2.3 User-generated drills
- Players and trainers can publish their own drills with uploaded videos.
- Trainer-published drills can be assigned to roster.
- Admins can promote user drills to the global library.

### 3.3 Training Log & Shot Tracking

#### 3.3.1 Session logging
- Player records every training session: drill performed, duration, sets, reps, perceived intensity (1–10), free-text notes.
- Sessions are timestamped (`completed_at`) for analytics.

#### 3.3.2 Shot tracking
- For shooting drills, players log makes / attempts.
- Shot **location** (e.g., corner three, left elbow, top of key, paint) and shot **type** (catch-and-shoot, off-the-dribble, free throw, layup) selected from admin-managed picklists.
- Locations are stored as half-court coordinates and rendered on a visual half-court chart.

#### 3.3.3 Bulk import
- CSV import for game stats from external sources (Hudl, MaxPreps): points, rebounds, assists, steals, blocks, FG/3PT/FT made/attempted, minutes.

### 3.4 Progress, Analytics & Visualization

#### 3.4.1 Dashboard
- At-a-glance summary: weekly training volume, current streak, recent achievements, daily challenge.

#### 3.4.2 Progress page
- **Stat cards** — totals for shots made/taken, drills completed, total minutes, weekly trend.
- **Shooting heatmap** — half-court visualization showing FG% by zone, color-graded.
- **Single configurable chart** — area chart with 11 selectable metrics (shots made, shots taken, threes, free throws, layups, mid-range, minutes, drills completed, FG%, 3PT%, mid-range%) and three time periods (weekly = last 7 days bucketed by day, monthly = current month bucketed by week, annual = Jan–Dec bucketed by month).
- **Empty state** for new users with CTAs to start a drill or log a session.

#### 3.4.3 Career page
- Lifetime stats, season-by-season breakdown, game log.
- XP and Level progression based on training activity.

#### 3.4.4 Trophy Room
- Achievements unlocked through milestones (first 100 makes, 7-day streak, 30-day streak, X drills completed in a category, etc.).
- Each trophy displays unlock date and is shareable.

### 3.5 Daily Streak Challenge
- A globally unique drill is generated **once per day** by GPT (via OpenAI integration) — every user worldwide sees the same drill that day.
- Players earn streak credit for completing the day's challenge.
- Streak history view shows past challenges and completion record.
- XP rewards scale with streak length.

### 3.6 Film Room (User Video Uploads)

#### 3.6.1 Upload
- Players upload videos of workouts or game film up to **4 GB** per file (client-side limit enforced).
- Two-step upload flow: request signed URL → direct upload to object storage → finalize.
- FFmpeg post-processing on the server: pass 1 attempts `-c:v copy -c:a aac -movflags +faststart`; pass 2 fallback re-encodes via `libx264` + `aac` for compatibility (fixes DaVinci Resolve LPCM audio that iOS can't play).

#### 3.6.2 Management
- Personal video library, set privacy (private / shared with trainer / public on profile).
- Trainer comment thread on shared videos.

### 3.7 Public Profiles & Discovery

#### 3.7.1 Player profile (`/player/:id`)
- Public-facing: bio, position, team, highlight videos, achievements, season stats, shareable link.
- Privacy controls: profile can be private, public, or visible only to connected trainers.

#### 3.7.2 Trainer profile (`/trainer/:id`)
- Bio, credentials, specialties, locations, hourly rate, availability, reviews, video samples, booking CTA.

#### 3.7.3 Finder
- Browse trainers and players by location (zip-code geocoding via the `zipcodes` package), skill, role, or name.

### 3.8 Trainer Mode

#### 3.8.1 Roster management
- View all assigned/connected players.
- Add players via universal invite system (link or email).
- Remove or archive players.

#### 3.8.2 Drill assignments
- Assign drills or workouts (sequenced drills) to individual players or groups.
- Set due dates and notes.
- Track completion in real time.

#### 3.8.3 Player evaluations
- Rate players on configurable skill attributes (IQ, athleticism, defense, shooting, ball-handling, leadership, etc.) on a 1–10 scale.
- Attribute set is admin-managed.
- Evaluations are versioned over time so a player can see growth trajectory.

#### 3.8.4 Group chat
- Create chat groups (e.g., team, training group) and message all members.

### 3.9 Bookings & Sessions

#### 3.9.1 Session booking
- Players browse a trainer's profile and request a session at a specific time/location.
- Trainer accepts, declines, or proposes alternative.
- Group sessions (multiple players, single trainer) supported.
- Reschedule and cancellation flows with policy enforcement.

#### 3.9.2 Google Calendar sync
- Trainers can connect Google Calendar (via `googleapis`).
- Confirmed sessions are pushed to the trainer's calendar; reschedules and cancellations propagate.

#### 3.9.3 Payment
- Stripe-powered checkout for one-time session payments and (future) recurring subscriptions.
- Integrated via the `stripe` Node SDK and `stripe-replit-sync` for DB synchronization.
- Payment confirmation triggers session-confirmation flow.

### 3.10 Communication

#### 3.10.1 Direct messaging
- 1:1 chat between connected users.
- Connections require an explicit request/accept handshake (universal connection system).

#### 3.10.2 Group chat
- Trainer-created groups for teams or training cohorts.

#### 3.10.3 Notifications
- **Email** — critical events (session confirmation, password reset, account changes) via SendGrid.
- **Web push** — VAPID-based push for browser users.
- **Native push** — APNs / FCM token registration for iOS / Android via Capacitor.
- **In-app notification center** showing unread events.

### 3.11 Parent / Guardian Mode

- Parent invites a minor child by email; child accepts or is invited via parent-created account.
- Parent dashboard shows the child's: recent training activity, evaluations, upcoming sessions, achievements.
- Optional **parent visibility toggle** that the player or trainer can adjust.
- Parents cannot log training, message non-connected users, or modify the child's account.

### 3.12 Feedback Forum
- Public-facing forum at `/feedback` for feature suggestions and bug reports.
- Users can submit, browse, **upvote**, and comment on entries.
- Admins triage and update status (planned, in-progress, shipped, declined).

### 3.13 Admin Dashboard

#### 3.13.1 Content management
- Drill library: create, edit, delete, categorize, attach videos and PDFs.
- Video library and PDF library (resources independent of drills).
- Picklists: shot locations (with court coordinates), shot types, evaluation attributes, metric templates.

#### 3.13.2 User management
- Search users, view profiles, grant/revoke admin, suspend accounts.
- Admin status verified via `storage.isUserAdmin(userId)` — never read from `users.role` directly.

#### 3.13.3 Analytics dashboard
- Platform metrics: DAU/WAU/MAU, sign-ups, session counts, drill popularity, completion rates, retention cohorts.

### 3.14 iOS Native App (Capacitor)

- Bundle ID: `com.playr1.training`, app name: "PLAYR1 Training".
- Loads from `https://PLAYR1Basketball.replit.app` (production server).
- Native splash: 500ms, dark background `#0a0a0a`, no spinner.
- Native push notifications (badge, sound, alert).
- Native camera access for Film Room recording.
- Status bar styled to match dark theme.
- Bearer-token auth (no cookies on iOS WebView).
- Safe-area insets respected throughout the UI.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Time-to-interactive on cold load:** target ≤ 2.5 s on a 4G connection.
- **Tab navigation:** ≤ 100 ms perceived latency (achieved via per-page chunk preloading on hover/touch + idle-time warm-up of common pages).
- **API response compression:** all responses > 1 KB are gzip/brotli compressed.
- **Static asset caching:** hashed JS/CSS/font assets served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` is `no-store` to prevent stale-bundle issues on iOS WebView.
- **Image optimization:** below-the-fold images use `loading="lazy"` and `decoding="async"`; hero images use `decoding="async"` + `fetchPriority="high"`.

### 4.2 Availability & Reliability
- **Health check endpoint:** `GET /api/health` returns `200 {status, uptimeSeconds, dbLatencyMs, dbReady, timestamp}` on success or `503` on failure. Used for uptime monitoring and post-deploy verification.
- **Database connection:** uses `@neondatabase/serverless` driver with WebSocket transport (required for Neon serverless Postgres which scales compute to zero on idle).
- **Pool configuration:** max 10 connections, 30 s idle timeout, 10 s connection timeout, error event handler attached.
- **Graceful degradation:** UI shows skeleton/empty states when data is unavailable rather than crashing.
- **Production isolation:** dev workspace and production deployment are fully isolated environments with separate databases.

### 4.3 Security
- **Authentication:** JWT with httpOnly + Secure + SameSite cookie on web; Bearer token in iOS Keychain-backed storage.
- **Authorization:** role checks server-side on every protected endpoint; admin status checked via `storage.isUserAdmin()`.
- **Rate limiting:**
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`): 20 requests / 15 minutes per IP.
  - All other API endpoints: 120 requests / minute per IP.
- **Input validation:** all request bodies validated with Zod schemas derived from `drizzle-zod`.
- **Password storage:** `bcryptjs` with appropriate work factor.
- **Object storage:** signed URLs for uploads; private files served only to authorized users via `getObjectUrl`.
- **CORS:** restricted to capacitor:// and ionic:// origins for native, same-origin for web.
- **Secrets management:** all credentials in environment variables; never committed.

### 4.4 Privacy
- Minor players' profiles default to private.
- Parent visibility is opt-in/opt-out per player.
- Public profile fields are explicitly chosen by the user.
- Account deletion removes personal data; aggregate analytics may persist anonymized.

### 4.5 Accessibility
- Color contrast meets WCAG AA on the dark theme.
- All interactive elements keyboard-navigable.
- Form inputs labeled; error messages associated via `aria-describedby`.
- Touch targets ≥ 44×44 pt on mobile.
- Dialogs include `DialogTitle` and `DialogDescription` (radix accessibility primitives).

### 4.6 Browser & Device Support
- **Browsers:** latest two major versions of Chrome, Safari, Firefox, Edge.
- **iOS:** 15.0+ (Capacitor 8 requirement).
- **Android:** API 23+ (Capacitor 8 requirement).
- **Mobile-first responsive design** with safe-area-inset handling.

### 4.7 Internationalization
- English only at launch. Architecture supports future i18n via React component-level string extraction.

### 4.8 Observability
- Structured request logging in production (`[express] METHOD path STATUS in Nms`).
- Error logging to deployment-log stream.
- Health endpoint for external monitor integration (UptimeRobot, BetterStack, etc.).

---

## 5. Data Model (high-level)

Stored in PostgreSQL via Drizzle ORM. Source of truth: `shared/schema.ts`.

| Domain | Key tables |
|---|---|
| Identity | `users`, `sessions`, `password_reset_tokens` |
| Profiles | `user_profiles`, `career_profiles`, `trainer_profiles`, `player_profiles`, `trainer_profile_locations`, `training_locations` |
| Connections | `player_trainer_connections`, `trainer_player_assignments`, `parent_child_relationships` |
| Teams | `team_clubs`, `leagues`, `trainer_teams`, `seasons`, `games` |
| Drills & Library | `drills`, `drill_metrics`, `drill_metric_templates`, `video_library`, `pdf_library`, `trainer_videos` |
| Training | `training_logs`, `training_log_metrics`, `metric_templates` |
| Shooting | `shot_locations`, `shot_types`, training-log shot rows |
| Challenges | `challenges`, daily challenge generation cache |
| Sessions | `training_sessions`, session-confirmation state |
| Messaging | `messages`, group/chat threads |
| Evaluations | `player_evaluations`, `evaluation_attributes` |
| Achievements | trophies / unlocked achievements |
| Feedback | `feedback`, `feedback_comments`, votes |
| Admin | admin flags, picklist tables |
| Push | `push_subscriptions`, native device tokens |

All schemas export: the table, an `insert` schema (`createInsertSchema(...).omit(...)`), an `Insert` type, and a `Select` type. Frontend and backend share this single source of truth via the `@shared` alias.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Frontend build | Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + zod resolver |
| UI components | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS, dark mode by default, orange (`#F97316`) primary |
| Icons | lucide-react, react-icons/si for brand logos |
| Backend | Node.js + Express |
| Database | PostgreSQL on Neon Serverless |
| ORM | Drizzle |
| Auth | bcryptjs + jsonwebtoken + cookie-parser |
| File storage | Replit App Storage (Google Cloud Storage backend) |
| Email | SendGrid |
| Push | web-push (VAPID) + native APNs/FCM via Capacitor |
| Payments | Stripe + stripe-replit-sync |
| Calendar | googleapis (Google Calendar) |
| AI | OpenAI via Replit AI Integrations (daily challenge generation) |
| Image generation | DiceBear (avatars) |
| Geocoding | `zipcodes` package |
| Mobile | Capacitor 8 (iOS + Android) |
| Video processing | ffmpeg |

### 6.2 Project structure
```
client/src/        — React frontend (pages, components, hooks, lib)
  pages/           — Route components
  components/      — Shared UI (sidebar, dialogs, charts, etc.)
  lib/
    pageLoaders.ts — Centralized lazy chunk loaders + preload helpers
    queryClient.ts — TanStack Query client + nativeFetch + getObjectUrl
shared/            — Code shared between client & server
  schema.ts        — Drizzle tables, Zod insert schemas, types
  models/          — Domain model exports
server/            — Express backend
  index.ts         — App bootstrap, middleware (compression, rate limit, CORS)
  routes.ts        — All API route definitions
  storage.ts       — IStorage interface + DB CRUD implementations
  db.ts            — Database pool + Drizzle instance
  auth.ts          — JWT + cookie auth
  static.ts        — Production static asset serving with cache headers
  replit_integrations/ — Object storage, auth, chat integrations
ios/               — Native iOS Capacitor project
docs/              — Documentation (this file)
```

### 6.3 API conventions
- All API routes are namespaced under `/api/`.
- Storage CRUD goes through the `IStorage` interface in `server/storage.ts`; routes stay thin.
- Request bodies validated against Zod schemas before reaching storage.
- Authenticated routes use `isAuthenticated` middleware which populates `req.user`.
- Admin routes additionally verify `storage.isUserAdmin(userId)`.

### 6.4 Critical implementation rules (developer-facing)
- All client-side `queryFn` and API calls must use `nativeFetch` from `@/lib/queryClient` — raw `fetch` breaks on iOS Capacitor.
- All image / video / avatar `src` attributes must go through `getObjectUrl` to resolve object-storage paths correctly on both web and native.
- Bulk-save routes must be declared **before** parameterized `:id` routes to avoid the wrong handler matching.
- New lazy pages must be registered in `client/src/lib/pageLoaders.ts` and added to the `routeToLoader` map for hover-preload to work.

### 6.5 Deployment & operations
- **Production:** Replit Deployment serving from `https://PLAYR1Basketball.replit.app` — fully isolated from the dev workspace, with its own database.
- **Publishing model:** code changes only reach production when the user explicitly clicks "Publish". Dev work has zero impact on live users.
- **Rollback:** previous deployments restorable from the Deployments tab.
- **Database migrations:** managed via `drizzle-kit push`. Never hand-write `ALTER TABLE` statements; never change primary-key column types.
- **Test accounts (production):**
  - `reviewer@playr1.app` / `Review2026!`
  - `nvnaso@outlook.com` / `Playr1Admin!`

---

## 7. Integrations

| Service | Purpose | How configured |
|---|---|---|
| Replit App Storage | Media uploads (videos, images, PDFs, avatars) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |
| SendGrid | Transactional email | `SENDGRID_API_KEY` |
| Stripe | Payments + subscriptions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Google OAuth | Calendar sync, future SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI (via Replit AI Integrations) | Daily challenge generation | Managed via integration |
| Replit Auth | "Login with Replit" | Managed via integration |

---

## 8. Out of Scope (current release)

- Live video streaming / real-time coaching sessions.
- In-app shot recognition from video (computer-vision drill scoring).
- Advanced recruiting marketplace (recruiter accounts, scholarship workflows).
- Tournament / league bracket management.
- Marketplace for trainer-published paid drill packs.
- Wearable / hardware integrations (motion sensors, smart-rims).
- Localization beyond English.

These are tracked in the feedback forum and may be planned for future releases.

---

## 9. Glossary

- **Drill** — A structured basketball exercise with instructions, video, and tracked metrics.
- **Training log** — A record of one completed drill or session, including stats.
- **Heatmap** — Visual half-court display of FG% by location.
- **Streak** — Consecutive days a player has completed the daily challenge.
- **Trophy** — An achievement unlocked by reaching a milestone.
- **Roster** — A trainer's collection of connected players.
- **Connection** — A mutually accepted relationship between two users (player/trainer, or peer/peer) that enables messaging.
- **Evaluation** — A trainer's structured rating of a player on configured skill attributes.
- **Career profile** — A player's lifetime stats and biographical information.
- **Film Room** — The user-uploaded video section of the app.

---

## 10. Acceptance Criteria — Production Readiness

A release is considered ready for production when all of the following pass:

- [ ] All affected routes return correct status codes for valid and invalid input.
- [ ] All forms validate input client-side and server-side.
- [ ] Health endpoint (`/api/health`) returns `200` with `dbReady: true`.
- [ ] No console errors on the dashboard, training-log, drills, or progress pages.
- [ ] iOS Capacitor build loads, authenticates, and fetches stats successfully.
- [ ] Push notifications deliver to a registered native device.
- [ ] Dark mode renders correctly on every page.
- [ ] Touch targets are ≥ 44×44 pt on mobile.
- [ ] Compression and long-cache headers are present on production responses.
- [ ] Deployment logs show no unhandled exceptions in the first 10 minutes after publish.

---

*End of document.*
# PLAYR1 — Product Requirements Document

**Product:** PLAYR1 — The Netflix for Basketball Training
**Document version:** 1.0
**Last updated:** April 17, 2026
**Status:** Live in production at `https://PLAYR1Basketball.replit.app`

---

## 1. Executive Summary

### 1.1 Vision
PLAYR1 is a comprehensive basketball training platform that gives players a complete, structured environment to develop their skills, track their growth, and connect with coaches and peers — modeled on the streaming-library experience of Netflix but built specifically around drill execution, performance tracking, and trainer collaboration.

### 1.2 Mission
Make professional-grade basketball development accessible to any player with a phone, while giving trainers and parents the tools to support, evaluate, and guide that development.

### 1.3 Core value proposition
- **For players:** A library of professional drills, a guided practice journal, visible progress over time, and a direct line to coaches.
- **For trainers:** A managed roster, drill assignment workflow, structured player evaluations, scheduled sessions, and a paid client management system.
- **For parents:** Visibility into a child's training without intruding on the player–coach relationship.
- **For the community:** Public profiles, shareable achievements, and a feedback loop into the product.

### 1.4 Platforms
- **Web app** — Responsive React/TypeScript single-page application.
- **iOS native app** — Capacitor-wrapped, distributed via App Store, loads from production URL with native push notifications and camera access.
- **Android native app** — Capacitor-configured (build pipeline ready).

---

## 2. User Personas & Roles

### 2.1 Player (primary)
A basketball player (typically middle-school through college, plus adult amateurs) who wants to improve specific skills, track practice consistency, and showcase development to coaches and recruiters.

### 2.2 Trainer / Coach
A basketball coach who manages a roster of players, prescribes workouts, evaluates performance, and books paid sessions.

### 2.3 Parent / Guardian
The parent of a minor player who wants visibility into the child's training activity, schedule, and evaluations without an active player account.

### 2.4 Admin
PLAYR1 staff who manage the global drill library, user accounts, content moderation, picklist values, and platform analytics.

### 2.5 Public visitor
Unauthenticated users browsing public player or trainer profiles, the marketing landing page, or shared achievement cards.

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

#### 3.1.1 Registration & login
- Email/password registration with email verification.
- Password hashing via `bcryptjs`.
- Stateless JWT authentication stored as an `httpOnly` cookie (`playr1_token`) on web; as a `Bearer` token in `localStorage` (`playr1_auth_token`) inside the iOS Capacitor app.
- "Login with Replit" SSO available (configured via `javascript_log_in_with_replit` integration).

#### 3.1.2 Password recovery
- "Forgot Password" flow sends a reset link via SendGrid.
- Time-limited single-use reset tokens.

#### 3.1.3 Onboarding wizard
On first login, new users complete:
- Role selection (Player / Trainer / Parent).
- Basic profile (name, avatar, location/zip code).
- Player-specific: grade, position, team affiliation, basketball goals.
- Trainer-specific: credentials, specialties, locations served.
- Parent-specific: invite or link to a child account.
- Avatar customization (skin tone, hair style via DiceBear).

#### 3.1.4 Account settings
- Profile editing, password change, email change, email-notification preferences, push-notification preferences, account deletion.

### 3.2 Drill Library

#### 3.2.1 Browse & search
- Searchable, filterable catalog of basketball drills, organized by category (shooting, ball-handling, passing, defense, conditioning, footwork, IQ).
- Each drill has: title, description, difficulty, duration estimate, required equipment, video tutorial, optional PDF guide, associated skill tags.

#### 3.2.2 Drill detail
- Embedded video player.
- Step-by-step instructions.
- "Start Drill" action that begins a guided training-log entry.
- Favorite / bookmark.

#### 3.2.3 User-generated drills
- Players and trainers can publish their own drills with uploaded videos.
- Trainer-published drills can be assigned to roster.
- Admins can promote user drills to the global library.

### 3.3 Training Log & Shot Tracking

#### 3.3.1 Session logging
- Player records every training session: drill performed, duration, sets, reps, perceived intensity (1–10), free-text notes.
- Sessions are timestamped (`completed_at`) for analytics.

#### 3.3.2 Shot tracking
- For shooting drills, players log makes / attempts.
- Shot **location** (e.g., corner three, left elbow, top of key, paint) and shot **type** (catch-and-shoot, off-the-dribble, free throw, layup) selected from admin-managed picklists.
- Locations are stored as half-court coordinates and rendered on a visual half-court chart.

#### 3.3.3 Bulk import
- CSV import for game stats from external sources (Hudl, MaxPreps): points, rebounds, assists, steals, blocks, FG/3PT/FT made/attempted, minutes.

### 3.4 Progress, Analytics & Visualization

#### 3.4.1 Dashboard
- At-a-glance summary: weekly training volume, current streak, recent achievements, daily challenge.

#### 3.4.2 Progress page
- **Stat cards** — totals for shots made/taken, drills completed, total minutes, weekly trend.
- **Shooting heatmap** — half-court visualization showing FG% by zone, color-graded.
- **Single configurable chart** — area chart with 11 selectable metrics (shots made, shots taken, threes, free throws, layups, mid-range, minutes, drills completed, FG%, 3PT%, mid-range%) and three time periods (weekly = last 7 days bucketed by day, monthly = current month bucketed by week, annual = Jan–Dec bucketed by month).
- **Empty state** for new users with CTAs to start a drill or log a session.

#### 3.4.3 Career page
- Lifetime stats, season-by-season breakdown, game log.
- XP and Level progression based on training activity.

#### 3.4.4 Trophy Room
- Achievements unlocked through milestones (first 100 makes, 7-day streak, 30-day streak, X drills completed in a category, etc.).
- Each trophy displays unlock date and is shareable.

### 3.5 Daily Streak Challenge
- A globally unique drill is generated **once per day** by GPT (via OpenAI integration) — every user worldwide sees the same drill that day.
- Players earn streak credit for completing the day's challenge.
- Streak history view shows past challenges and completion record.
- XP rewards scale with streak length.

### 3.6 Film Room (User Video Uploads)

#### 3.6.1 Upload
- Players upload videos of workouts or game film up to **4 GB** per file (client-side limit enforced).
- Two-step upload flow: request signed URL → direct upload to object storage → finalize.
- FFmpeg post-processing on the server: pass 1 attempts `-c:v copy -c:a aac -movflags +faststart`; pass 2 fallback re-encodes via `libx264` + `aac` for compatibility (fixes DaVinci Resolve LPCM audio that iOS can't play).

#### 3.6.2 Management
- Personal video library, set privacy (private / shared with trainer / public on profile).
- Trainer comment thread on shared videos.

### 3.7 Public Profiles & Discovery

#### 3.7.1 Player profile (`/player/:id`)
- Public-facing: bio, position, team, highlight videos, achievements, season stats, shareable link.
- Privacy controls: profile can be private, public, or visible only to connected trainers.

#### 3.7.2 Trainer profile (`/trainer/:id`)
- Bio, credentials, specialties, locations, hourly rate, availability, reviews, video samples, booking CTA.

#### 3.7.3 Finder
- Browse trainers and players by location (zip-code geocoding via the `zipcodes` package), skill, role, or name.

### 3.8 Trainer Mode

#### 3.8.1 Roster management
- View all assigned/connected players.
- Add players via universal invite system (link or email).
- Remove or archive players.

#### 3.8.2 Drill assignments
- Assign drills or workouts (sequenced drills) to individual players or groups.
- Set due dates and notes.
- Track completion in real time.

#### 3.8.3 Player evaluations
- Rate players on configurable skill attributes (IQ, athleticism, defense, shooting, ball-handling, leadership, etc.) on a 1–10 scale.
- Attribute set is admin-managed.
- Evaluations are versioned over time so a player can see growth trajectory.

#### 3.8.4 Group chat
- Create chat groups (e.g., team, training group) and message all members.

### 3.9 Bookings & Sessions

#### 3.9.1 Session booking
- Players browse a trainer's profile and request a session at a specific time/location.
- Trainer accepts, declines, or proposes alternative.
- Group sessions (multiple players, single trainer) supported.
- Reschedule and cancellation flows with policy enforcement.

#### 3.9.2 Google Calendar sync
- Trainers can connect Google Calendar (via `googleapis`).
- Confirmed sessions are pushed to the trainer's calendar; reschedules and cancellations propagate.

#### 3.9.3 Payment
- Stripe-powered checkout for one-time session payments and (future) recurring subscriptions.
- Integrated via the `stripe` Node SDK and `stripe-replit-sync` for DB synchronization.
- Payment confirmation triggers session-confirmation flow.

### 3.10 Communication

#### 3.10.1 Direct messaging
- 1:1 chat between connected users.
- Connections require an explicit request/accept handshake (universal connection system).

#### 3.10.2 Group chat
- Trainer-created groups for teams or training cohorts.

#### 3.10.3 Notifications
- **Email** — critical events (session confirmation, password reset, account changes) via SendGrid.
- **Web push** — VAPID-based push for browser users.
- **Native push** — APNs / FCM token registration for iOS / Android via Capacitor.
- **In-app notification center** showing unread events.

### 3.11 Parent / Guardian Mode

- Parent invites a minor child by email; child accepts or is invited via parent-created account.
- Parent dashboard shows the child's: recent training activity, evaluations, upcoming sessions, achievements.
- Optional **parent visibility toggle** that the player or trainer can adjust.
- Parents cannot log training, message non-connected users, or modify the child's account.

### 3.12 Feedback Forum
- Public-facing forum at `/feedback` for feature suggestions and bug reports.
- Users can submit, browse, **upvote**, and comment on entries.
- Admins triage and update status (planned, in-progress, shipped, declined).

### 3.13 Admin Dashboard

#### 3.13.1 Content management
- Drill library: create, edit, delete, categorize, attach videos and PDFs.
- Video library and PDF library (resources independent of drills).
- Picklists: shot locations (with court coordinates), shot types, evaluation attributes, metric templates.

#### 3.13.2 User management
- Search users, view profiles, grant/revoke admin, suspend accounts.
- Admin status verified via `storage.isUserAdmin(userId)` — never read from `users.role` directly.

#### 3.13.3 Analytics dashboard
- Platform metrics: DAU/WAU/MAU, sign-ups, session counts, drill popularity, completion rates, retention cohorts.

### 3.14 iOS Native App (Capacitor)

- Bundle ID: `com.playr1.training`, app name: "PLAYR1 Training".
- Loads from `https://PLAYR1Basketball.replit.app` (production server).
- Native splash: 500ms, dark background `#0a0a0a`, no spinner.
- Native push notifications (badge, sound, alert).
- Native camera access for Film Room recording.
- Status bar styled to match dark theme.
- Bearer-token auth (no cookies on iOS WebView).
- Safe-area insets respected throughout the UI.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Time-to-interactive on cold load:** target ≤ 2.5 s on a 4G connection.
- **Tab navigation:** ≤ 100 ms perceived latency (achieved via per-page chunk preloading on hover/touch + idle-time warm-up of common pages).
- **API response compression:** all responses > 1 KB are gzip/brotli compressed.
- **Static asset caching:** hashed JS/CSS/font assets served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` is `no-store` to prevent stale-bundle issues on iOS WebView.
- **Image optimization:** below-the-fold images use `loading="lazy"` and `decoding="async"`; hero images use `decoding="async"` + `fetchPriority="high"`.

### 4.2 Availability & Reliability
- **Health check endpoint:** `GET /api/health` returns `200 {status, uptimeSeconds, dbLatencyMs, dbReady, timestamp}` on success or `503` on failure. Used for uptime monitoring and post-deploy verification.
- **Database connection:** uses `@neondatabase/serverless` driver with WebSocket transport (required for Neon serverless Postgres which scales compute to zero on idle).
- **Pool configuration:** max 10 connections, 30 s idle timeout, 10 s connection timeout, error event handler attached.
- **Graceful degradation:** UI shows skeleton/empty states when data is unavailable rather than crashing.
- **Production isolation:** dev workspace and production deployment are fully isolated environments with separate databases.

### 4.3 Security
- **Authentication:** JWT with httpOnly + Secure + SameSite cookie on web; Bearer token in iOS Keychain-backed storage.
- **Authorization:** role checks server-side on every protected endpoint; admin status checked via `storage.isUserAdmin()`.
- **Rate limiting:**
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`): 20 requests / 15 minutes per IP.
  - All other API endpoints: 120 requests / minute per IP.
- **Input validation:** all request bodies validated with Zod schemas derived from `drizzle-zod`.
- **Password storage:** `bcryptjs` with appropriate work factor.
- **Object storage:** signed URLs for uploads; private files served only to authorized users via `getObjectUrl`.
- **CORS:** restricted to capacitor:// and ionic:// origins for native, same-origin for web.
- **Secrets management:** all credentials in environment variables; never committed.

### 4.4 Privacy
- Minor players' profiles default to private.
- Parent visibility is opt-in/opt-out per player.
- Public profile fields are explicitly chosen by the user.
- Account deletion removes personal data; aggregate analytics may persist anonymized.

### 4.5 Accessibility
- Color contrast meets WCAG AA on the dark theme.
- All interactive elements keyboard-navigable.
- Form inputs labeled; error messages associated via `aria-describedby`.
- Touch targets ≥ 44×44 pt on mobile.
- Dialogs include `DialogTitle` and `DialogDescription` (radix accessibility primitives).

### 4.6 Browser & Device Support
- **Browsers:** latest two major versions of Chrome, Safari, Firefox, Edge.
- **iOS:** 15.0+ (Capacitor 8 requirement).
- **Android:** API 23+ (Capacitor 8 requirement).
- **Mobile-first responsive design** with safe-area-inset handling.

### 4.7 Internationalization
- English only at launch. Architecture supports future i18n via React component-level string extraction.

### 4.8 Observability
- Structured request logging in production (`[express] METHOD path STATUS in Nms`).
- Error logging to deployment-log stream.
- Health endpoint for external monitor integration (UptimeRobot, BetterStack, etc.).

---

## 5. Data Model (high-level)

Stored in PostgreSQL via Drizzle ORM. Source of truth: `shared/schema.ts`.

| Domain | Key tables |
|---|---|
| Identity | `users`, `sessions`, `password_reset_tokens` |
| Profiles | `user_profiles`, `career_profiles`, `trainer_profiles`, `player_profiles`, `trainer_profile_locations`, `training_locations` |
| Connections | `player_trainer_connections`, `trainer_player_assignments`, `parent_child_relationships` |
| Teams | `team_clubs`, `leagues`, `trainer_teams`, `seasons`, `games` |
| Drills & Library | `drills`, `drill_metrics`, `drill_metric_templates`, `video_library`, `pdf_library`, `trainer_videos` |
| Training | `training_logs`, `training_log_metrics`, `metric_templates` |
| Shooting | `shot_locations`, `shot_types`, training-log shot rows |
| Challenges | `challenges`, daily challenge generation cache |
| Sessions | `training_sessions`, session-confirmation state |
| Messaging | `messages`, group/chat threads |
| Evaluations | `player_evaluations`, `evaluation_attributes` |
| Achievements | trophies / unlocked achievements |
| Feedback | `feedback`, `feedback_comments`, votes |
| Admin | admin flags, picklist tables |
| Push | `push_subscriptions`, native device tokens |

All schemas export: the table, an `insert` schema (`createInsertSchema(...).omit(...)`), an `Insert` type, and a `Select` type. Frontend and backend share this single source of truth via the `@shared` alias.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Frontend build | Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + zod resolver |
| UI components | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS, dark mode by default, orange (`#F97316`) primary |
| Icons | lucide-react, react-icons/si for brand logos |
| Backend | Node.js + Express |
| Database | PostgreSQL on Neon Serverless |
| ORM | Drizzle |
| Auth | bcryptjs + jsonwebtoken + cookie-parser |
| File storage | Replit App Storage (Google Cloud Storage backend) |
| Email | SendGrid |
| Push | web-push (VAPID) + native APNs/FCM via Capacitor |
| Payments | Stripe + stripe-replit-sync |
| Calendar | googleapis (Google Calendar) |
| AI | OpenAI via Replit AI Integrations (daily challenge generation) |
| Image generation | DiceBear (avatars) |
| Geocoding | `zipcodes` package |
| Mobile | Capacitor 8 (iOS + Android) |
| Video processing | ffmpeg |

### 6.2 Project structure
```
client/src/        — React frontend (pages, components, hooks, lib)
  pages/           — Route components
  components/      — Shared UI (sidebar, dialogs, charts, etc.)
  lib/
    pageLoaders.ts — Centralized lazy chunk loaders + preload helpers
    queryClient.ts — TanStack Query client + nativeFetch + getObjectUrl
shared/            — Code shared between client & server
  schema.ts        — Drizzle tables, Zod insert schemas, types
  models/          — Domain model exports
server/            — Express backend
  index.ts         — App bootstrap, middleware (compression, rate limit, CORS)
  routes.ts        — All API route definitions
  storage.ts       — IStorage interface + DB CRUD implementations
  db.ts            — Database pool + Drizzle instance
  auth.ts          — JWT + cookie auth
  static.ts        — Production static asset serving with cache headers
  replit_integrations/ — Object storage, auth, chat integrations
ios/               — Native iOS Capacitor project
docs/              — Documentation (this file)
```

### 6.3 API conventions
- All API routes are namespaced under `/api/`.
- Storage CRUD goes through the `IStorage` interface in `server/storage.ts`; routes stay thin.
- Request bodies validated against Zod schemas before reaching storage.
- Authenticated routes use `isAuthenticated` middleware which populates `req.user`.
- Admin routes additionally verify `storage.isUserAdmin(userId)`.

### 6.4 Critical implementation rules (developer-facing)
- All client-side `queryFn` and API calls must use `nativeFetch` from `@/lib/queryClient` — raw `fetch` breaks on iOS Capacitor.
- All image / video / avatar `src` attributes must go through `getObjectUrl` to resolve object-storage paths correctly on both web and native.
- Bulk-save routes must be declared **before** parameterized `:id` routes to avoid the wrong handler matching.
- New lazy pages must be registered in `client/src/lib/pageLoaders.ts` and added to the `routeToLoader` map for hover-preload to work.

### 6.5 Deployment & operations
- **Production:** Replit Deployment serving from `https://PLAYR1Basketball.replit.app` — fully isolated from the dev workspace, with its own database.
- **Publishing model:** code changes only reach production when the user explicitly clicks "Publish". Dev work has zero impact on live users.
- **Rollback:** previous deployments restorable from the Deployments tab.
- **Database migrations:** managed via `drizzle-kit push`. Never hand-write `ALTER TABLE` statements; never change primary-key column types.
- **Test accounts (production):**
  - `reviewer@playr1.app` / `Review2026!`
  - `nvnaso@outlook.com` / `Playr1Admin!`

---

## 7. Integrations

| Service | Purpose | How configured |
|---|---|---|
| Replit App Storage | Media uploads (videos, images, PDFs, avatars) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |
| SendGrid | Transactional email | `SENDGRID_API_KEY` |
| Stripe | Payments + subscriptions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Google OAuth | Calendar sync, future SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI (via Replit AI Integrations) | Daily challenge generation | Managed via integration |
| Replit Auth | "Login with Replit" | Managed via integration |

---

## 8. Out of Scope (current release)

- Live video streaming / real-time coaching sessions.
- In-app shot recognition from video (computer-vision drill scoring).
- Advanced recruiting marketplace (recruiter accounts, scholarship workflows).
- Tournament / league bracket management.
- Marketplace for trainer-published paid drill packs.
- Wearable / hardware integrations (motion sensors, smart-rims).
- Localization beyond English.

These are tracked in the feedback forum and may be planned for future releases.

---

## 9. Glossary

- **Drill** — A structured basketball exercise with instructions, video, and tracked metrics.
- **Training log** — A record of one completed drill or session, including stats.
- **Heatmap** — Visual half-court display of FG% by location.
- **Streak** — Consecutive days a player has completed the daily challenge.
- **Trophy** — An achievement unlocked by reaching a milestone.
- **Roster** — A trainer's collection of connected players.
- **Connection** — A mutually accepted relationship between two users (player/trainer, or peer/peer) that enables messaging.
- **Evaluation** — A trainer's structured rating of a player on configured skill attributes.
- **Career profile** — A player's lifetime stats and biographical information.
- **Film Room** — The user-uploaded video section of the app.

---

## 10. Acceptance Criteria — Production Readiness

A release is considered ready for production when all of the following pass:

- [ ] All affected routes return correct status codes for valid and invalid input.
- [ ] All forms validate input client-side and server-side.
- [ ] Health endpoint (`/api/health`) returns `200` with `dbReady: true`.
- [ ] No console errors on the dashboard, training-log, drills, or progress pages.
- [ ] iOS Capacitor build loads, authenticates, and fetches stats successfully.
- [ ] Push notifications deliver to a registered native device.
- [ ] Dark mode renders correctly on every page.
- [ ] Touch targets are ≥ 44×44 pt on mobile.
- [ ] Compression and long-cache headers are present on production responses.
- [ ] Deployment logs show no unhandled exceptions in the first 10 minutes after publish.

---

*End of document.*
# PLAYR1 — Product Requirements Document

**Product:** PLAYR1 — The Netflix for Basketball Training
**Document version:** 1.0
**Last updated:** April 17, 2026
**Status:** Live in production at `https://PLAYR1Basketball.replit.app`

---

## 1. Executive Summary

### 1.1 Vision
PLAYR1 is a comprehensive basketball training platform that gives players a complete, structured environment to develop their skills, track their growth, and connect with coaches and peers — modeled on the streaming-library experience of Netflix but built specifically around drill execution, performance tracking, and trainer collaboration.

### 1.2 Mission
Make professional-grade basketball development accessible to any player with a phone, while giving trainers and parents the tools to support, evaluate, and guide that development.

### 1.3 Core value proposition
- **For players:** A library of professional drills, a guided practice journal, visible progress over time, and a direct line to coaches.
- **For trainers:** A managed roster, drill assignment workflow, structured player evaluations, scheduled sessions, and a paid client management system.
- **For parents:** Visibility into a child's training without intruding on the player–coach relationship.
- **For the community:** Public profiles, shareable achievements, and a feedback loop into the product.

### 1.4 Platforms
- **Web app** — Responsive React/TypeScript single-page application.
- **iOS native app** — Capacitor-wrapped, distributed via App Store, loads from production URL with native push notifications and camera access.
- **Android native app** — Capacitor-configured (build pipeline ready).

---

## 2. User Personas & Roles

### 2.1 Player (primary)
A basketball player (typically middle-school through college, plus adult amateurs) who wants to improve specific skills, track practice consistency, and showcase development to coaches and recruiters.

### 2.2 Trainer / Coach
A basketball coach who manages a roster of players, prescribes workouts, evaluates performance, and books paid sessions.

### 2.3 Parent / Guardian
The parent of a minor player who wants visibility into the child's training activity, schedule, and evaluations without an active player account.

### 2.4 Admin
PLAYR1 staff who manage the global drill library, user accounts, content moderation, picklist values, and platform analytics.

### 2.5 Public visitor
Unauthenticated users browsing public player or trainer profiles, the marketing landing page, or shared achievement cards.

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

#### 3.1.1 Registration & login
- Email/password registration with email verification.
- Password hashing via `bcryptjs`.
- Stateless JWT authentication stored as an `httpOnly` cookie (`playr1_token`) on web; as a `Bearer` token in `localStorage` (`playr1_auth_token`) inside the iOS Capacitor app.
- "Login with Replit" SSO available (configured via `javascript_log_in_with_replit` integration).

#### 3.1.2 Password recovery
- "Forgot Password" flow sends a reset link via SendGrid.
- Time-limited single-use reset tokens.

#### 3.1.3 Onboarding wizard
On first login, new users complete:
- Role selection (Player / Trainer / Parent).
- Basic profile (name, avatar, location/zip code).
- Player-specific: grade, position, team affiliation, basketball goals.
- Trainer-specific: credentials, specialties, locations served.
- Parent-specific: invite or link to a child account.
- Avatar customization (skin tone, hair style via DiceBear).

#### 3.1.4 Account settings
- Profile editing, password change, email change, email-notification preferences, push-notification preferences, account deletion.

### 3.2 Drill Library

#### 3.2.1 Browse & search
- Searchable, filterable catalog of basketball drills, organized by category (shooting, ball-handling, passing, defense, conditioning, footwork, IQ).
- Each drill has: title, description, difficulty, duration estimate, required equipment, video tutorial, optional PDF guide, associated skill tags.

#### 3.2.2 Drill detail
- Embedded video player.
- Step-by-step instructions.
- "Start Drill" action that begins a guided training-log entry.
- Favorite / bookmark.

#### 3.2.3 User-generated drills
- Players and trainers can publish their own drills with uploaded videos.
- Trainer-published drills can be assigned to roster.
- Admins can promote user drills to the global library.

### 3.3 Training Log & Shot Tracking

#### 3.3.1 Session logging
- Player records every training session: drill performed, duration, sets, reps, perceived intensity (1–10), free-text notes.
- Sessions are timestamped (`completed_at`) for analytics.

#### 3.3.2 Shot tracking
- For shooting drills, players log makes / attempts.
- Shot **location** (e.g., corner three, left elbow, top of key, paint) and shot **type** (catch-and-shoot, off-the-dribble, free throw, layup) selected from admin-managed picklists.
- Locations are stored as half-court coordinates and rendered on a visual half-court chart.

#### 3.3.3 Bulk import
- CSV import for game stats from external sources (Hudl, MaxPreps): points, rebounds, assists, steals, blocks, FG/3PT/FT made/attempted, minutes.

### 3.4 Progress, Analytics & Visualization

#### 3.4.1 Dashboard
- At-a-glance summary: weekly training volume, current streak, recent achievements, daily challenge.

#### 3.4.2 Progress page
- **Stat cards** — totals for shots made/taken, drills completed, total minutes, weekly trend.
- **Shooting heatmap** — half-court visualization showing FG% by zone, color-graded.
- **Single configurable chart** — area chart with 11 selectable metrics (shots made, shots taken, threes, free throws, layups, mid-range, minutes, drills completed, FG%, 3PT%, mid-range%) and three time periods (weekly = last 7 days bucketed by day, monthly = current month bucketed by week, annual = Jan–Dec bucketed by month).
- **Empty state** for new users with CTAs to start a drill or log a session.

#### 3.4.3 Career page
- Lifetime stats, season-by-season breakdown, game log.
- XP and Level progression based on training activity.

#### 3.4.4 Trophy Room
- Achievements unlocked through milestones (first 100 makes, 7-day streak, 30-day streak, X drills completed in a category, etc.).
- Each trophy displays unlock date and is shareable.

### 3.5 Daily Streak Challenge
- A globally unique drill is generated **once per day** by GPT (via OpenAI integration) — every user worldwide sees the same drill that day.
- Players earn streak credit for completing the day's challenge.
- Streak history view shows past challenges and completion record.
- XP rewards scale with streak length.

### 3.6 Film Room (User Video Uploads)

#### 3.6.1 Upload
- Players upload videos of workouts or game film up to **4 GB** per file (client-side limit enforced).
- Two-step upload flow: request signed URL → direct upload to object storage → finalize.
- FFmpeg post-processing on the server: pass 1 attempts `-c:v copy -c:a aac -movflags +faststart`; pass 2 fallback re-encodes via `libx264` + `aac` for compatibility (fixes DaVinci Resolve LPCM audio that iOS can't play).

#### 3.6.2 Management
- Personal video library, set privacy (private / shared with trainer / public on profile).
- Trainer comment thread on shared videos.

### 3.7 Public Profiles & Discovery

#### 3.7.1 Player profile (`/player/:id`)
- Public-facing: bio, position, team, highlight videos, achievements, season stats, shareable link.
- Privacy controls: profile can be private, public, or visible only to connected trainers.

#### 3.7.2 Trainer profile (`/trainer/:id`)
- Bio, credentials, specialties, locations, hourly rate, availability, reviews, video samples, booking CTA.

#### 3.7.3 Finder
- Browse trainers and players by location (zip-code geocoding via the `zipcodes` package), skill, role, or name.

### 3.8 Trainer Mode

#### 3.8.1 Roster management
- View all assigned/connected players.
- Add players via universal invite system (link or email).
- Remove or archive players.

#### 3.8.2 Drill assignments
- Assign drills or workouts (sequenced drills) to individual players or groups.
- Set due dates and notes.
- Track completion in real time.

#### 3.8.3 Player evaluations
- Rate players on configurable skill attributes (IQ, athleticism, defense, shooting, ball-handling, leadership, etc.) on a 1–10 scale.
- Attribute set is admin-managed.
- Evaluations are versioned over time so a player can see growth trajectory.

#### 3.8.4 Group chat
- Create chat groups (e.g., team, training group) and message all members.

### 3.9 Bookings & Sessions

#### 3.9.1 Session booking
- Players browse a trainer's profile and request a session at a specific time/location.
- Trainer accepts, declines, or proposes alternative.
- Group sessions (multiple players, single trainer) supported.
- Reschedule and cancellation flows with policy enforcement.

#### 3.9.2 Google Calendar sync
- Trainers can connect Google Calendar (via `googleapis`).
- Confirmed sessions are pushed to the trainer's calendar; reschedules and cancellations propagate.

#### 3.9.3 Payment
- Stripe-powered checkout for one-time session payments and (future) recurring subscriptions.
- Integrated via the `stripe` Node SDK and `stripe-replit-sync` for DB synchronization.
- Payment confirmation triggers session-confirmation flow.

### 3.10 Communication

#### 3.10.1 Direct messaging
- 1:1 chat between connected users.
- Connections require an explicit request/accept handshake (universal connection system).

#### 3.10.2 Group chat
- Trainer-created groups for teams or training cohorts.

#### 3.10.3 Notifications
- **Email** — critical events (session confirmation, password reset, account changes) via SendGrid.
- **Web push** — VAPID-based push for browser users.
- **Native push** — APNs / FCM token registration for iOS / Android via Capacitor.
- **In-app notification center** showing unread events.

### 3.11 Parent / Guardian Mode

- Parent invites a minor child by email; child accepts or is invited via parent-created account.
- Parent dashboard shows the child's: recent training activity, evaluations, upcoming sessions, achievements.
- Optional **parent visibility toggle** that the player or trainer can adjust.
- Parents cannot log training, message non-connected users, or modify the child's account.

### 3.12 Feedback Forum
- Public-facing forum at `/feedback` for feature suggestions and bug reports.
- Users can submit, browse, **upvote**, and comment on entries.
- Admins triage and update status (planned, in-progress, shipped, declined).

### 3.13 Admin Dashboard

#### 3.13.1 Content management
- Drill library: create, edit, delete, categorize, attach videos and PDFs.
- Video library and PDF library (resources independent of drills).
- Picklists: shot locations (with court coordinates), shot types, evaluation attributes, metric templates.

#### 3.13.2 User management
- Search users, view profiles, grant/revoke admin, suspend accounts.
- Admin status verified via `storage.isUserAdmin(userId)` — never read from `users.role` directly.

#### 3.13.3 Analytics dashboard
- Platform metrics: DAU/WAU/MAU, sign-ups, session counts, drill popularity, completion rates, retention cohorts.

### 3.14 iOS Native App (Capacitor)

- Bundle ID: `com.playr1.training`, app name: "PLAYR1 Training".
- Loads from `https://PLAYR1Basketball.replit.app` (production server).
- Native splash: 500ms, dark background `#0a0a0a`, no spinner.
- Native push notifications (badge, sound, alert).
- Native camera access for Film Room recording.
- Status bar styled to match dark theme.
- Bearer-token auth (no cookies on iOS WebView).
- Safe-area insets respected throughout the UI.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Time-to-interactive on cold load:** target ≤ 2.5 s on a 4G connection.
- **Tab navigation:** ≤ 100 ms perceived latency (achieved via per-page chunk preloading on hover/touch + idle-time warm-up of common pages).
- **API response compression:** all responses > 1 KB are gzip/brotli compressed.
- **Static asset caching:** hashed JS/CSS/font assets served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` is `no-store` to prevent stale-bundle issues on iOS WebView.
- **Image optimization:** below-the-fold images use `loading="lazy"` and `decoding="async"`; hero images use `decoding="async"` + `fetchPriority="high"`.

### 4.2 Availability & Reliability
- **Health check endpoint:** `GET /api/health` returns `200 {status, uptimeSeconds, dbLatencyMs, dbReady, timestamp}` on success or `503` on failure. Used for uptime monitoring and post-deploy verification.
- **Database connection:** uses `@neondatabase/serverless` driver with WebSocket transport (required for Neon serverless Postgres which scales compute to zero on idle).
- **Pool configuration:** max 10 connections, 30 s idle timeout, 10 s connection timeout, error event handler attached.
- **Graceful degradation:** UI shows skeleton/empty states when data is unavailable rather than crashing.
- **Production isolation:** dev workspace and production deployment are fully isolated environments with separate databases.

### 4.3 Security
- **Authentication:** JWT with httpOnly + Secure + SameSite cookie on web; Bearer token in iOS Keychain-backed storage.
- **Authorization:** role checks server-side on every protected endpoint; admin status checked via `storage.isUserAdmin()`.
- **Rate limiting:**
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`): 20 requests / 15 minutes per IP.
  - All other API endpoints: 120 requests / minute per IP.
- **Input validation:** all request bodies validated with Zod schemas derived from `drizzle-zod`.
- **Password storage:** `bcryptjs` with appropriate work factor.
- **Object storage:** signed URLs for uploads; private files served only to authorized users via `getObjectUrl`.
- **CORS:** restricted to capacitor:// and ionic:// origins for native, same-origin for web.
- **Secrets management:** all credentials in environment variables; never committed.

### 4.4 Privacy
- Minor players' profiles default to private.
- Parent visibility is opt-in/opt-out per player.
- Public profile fields are explicitly chosen by the user.
- Account deletion removes personal data; aggregate analytics may persist anonymized.

### 4.5 Accessibility
- Color contrast meets WCAG AA on the dark theme.
- All interactive elements keyboard-navigable.
- Form inputs labeled; error messages associated via `aria-describedby`.
- Touch targets ≥ 44×44 pt on mobile.
- Dialogs include `DialogTitle` and `DialogDescription` (radix accessibility primitives).

### 4.6 Browser & Device Support
- **Browsers:** latest two major versions of Chrome, Safari, Firefox, Edge.
- **iOS:** 15.0+ (Capacitor 8 requirement).
- **Android:** API 23+ (Capacitor 8 requirement).
- **Mobile-first responsive design** with safe-area-inset handling.

### 4.7 Internationalization
- English only at launch. Architecture supports future i18n via React component-level string extraction.

### 4.8 Observability
- Structured request logging in production (`[express] METHOD path STATUS in Nms`).
- Error logging to deployment-log stream.
- Health endpoint for external monitor integration (UptimeRobot, BetterStack, etc.).

---

## 5. Data Model (high-level)

Stored in PostgreSQL via Drizzle ORM. Source of truth: `shared/schema.ts`.

| Domain | Key tables |
|---|---|
| Identity | `users`, `sessions`, `password_reset_tokens` |
| Profiles | `user_profiles`, `career_profiles`, `trainer_profiles`, `player_profiles`, `trainer_profile_locations`, `training_locations` |
| Connections | `player_trainer_connections`, `trainer_player_assignments`, `parent_child_relationships` |
| Teams | `team_clubs`, `leagues`, `trainer_teams`, `seasons`, `games` |
| Drills & Library | `drills`, `drill_metrics`, `drill_metric_templates`, `video_library`, `pdf_library`, `trainer_videos` |
| Training | `training_logs`, `training_log_metrics`, `metric_templates` |
| Shooting | `shot_locations`, `shot_types`, training-log shot rows |
| Challenges | `challenges`, daily challenge generation cache |
| Sessions | `training_sessions`, session-confirmation state |
| Messaging | `messages`, group/chat threads |
| Evaluations | `player_evaluations`, `evaluation_attributes` |
| Achievements | trophies / unlocked achievements |
| Feedback | `feedback`, `feedback_comments`, votes |
| Admin | admin flags, picklist tables |
| Push | `push_subscriptions`, native device tokens |

All schemas export: the table, an `insert` schema (`createInsertSchema(...).omit(...)`), an `Insert` type, and a `Select` type. Frontend and backend share this single source of truth via the `@shared` alias.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Frontend build | Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + zod resolver |
| UI components | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS, dark mode by default, orange (`#F97316`) primary |
| Icons | lucide-react, react-icons/si for brand logos |
| Backend | Node.js + Express |
| Database | PostgreSQL on Neon Serverless |
| ORM | Drizzle |
| Auth | bcryptjs + jsonwebtoken + cookie-parser |
| File storage | Replit App Storage (Google Cloud Storage backend) |
| Email | SendGrid |
| Push | web-push (VAPID) + native APNs/FCM via Capacitor |
| Payments | Stripe + stripe-replit-sync |
| Calendar | googleapis (Google Calendar) |
| AI | OpenAI via Replit AI Integrations (daily challenge generation) |
| Image generation | DiceBear (avatars) |
| Geocoding | `zipcodes` package |
| Mobile | Capacitor 8 (iOS + Android) |
| Video processing | ffmpeg |

### 6.2 Project structure
```
client/src/        — React frontend (pages, components, hooks, lib)
  pages/           — Route components
  components/      — Shared UI (sidebar, dialogs, charts, etc.)
  lib/
    pageLoaders.ts — Centralized lazy chunk loaders + preload helpers
    queryClient.ts — TanStack Query client + nativeFetch + getObjectUrl
shared/            — Code shared between client & server
  schema.ts        — Drizzle tables, Zod insert schemas, types
  models/          — Domain model exports
server/            — Express backend
  index.ts         — App bootstrap, middleware (compression, rate limit, CORS)
  routes.ts        — All API route definitions
  storage.ts       — IStorage interface + DB CRUD implementations
  db.ts            — Database pool + Drizzle instance
  auth.ts          — JWT + cookie auth
  static.ts        — Production static asset serving with cache headers
  replit_integrations/ — Object storage, auth, chat integrations
ios/               — Native iOS Capacitor project
docs/              — Documentation (this file)
```

### 6.3 API conventions
- All API routes are namespaced under `/api/`.
- Storage CRUD goes through the `IStorage` interface in `server/storage.ts`; routes stay thin.
- Request bodies validated against Zod schemas before reaching storage.
- Authenticated routes use `isAuthenticated` middleware which populates `req.user`.
- Admin routes additionally verify `storage.isUserAdmin(userId)`.

### 6.4 Critical implementation rules (developer-facing)
- All client-side `queryFn` and API calls must use `nativeFetch` from `@/lib/queryClient` — raw `fetch` breaks on iOS Capacitor.
- All image / video / avatar `src` attributes must go through `getObjectUrl` to resolve object-storage paths correctly on both web and native.
- Bulk-save routes must be declared **before** parameterized `:id` routes to avoid the wrong handler matching.
- New lazy pages must be registered in `client/src/lib/pageLoaders.ts` and added to the `routeToLoader` map for hover-preload to work.

### 6.5 Deployment & operations
- **Production:** Replit Deployment serving from `https://PLAYR1Basketball.replit.app` — fully isolated from the dev workspace, with its own database.
- **Publishing model:** code changes only reach production when the user explicitly clicks "Publish". Dev work has zero impact on live users.
- **Rollback:** previous deployments restorable from the Deployments tab.
- **Database migrations:** managed via `drizzle-kit push`. Never hand-write `ALTER TABLE` statements; never change primary-key column types.
- **Test accounts (production):**
  - `reviewer@playr1.app` / `Review2026!`
  - `nvnaso@outlook.com` / `Playr1Admin!`

---

## 7. Integrations

| Service | Purpose | How configured |
|---|---|---|
| Replit App Storage | Media uploads (videos, images, PDFs, avatars) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |
| SendGrid | Transactional email | `SENDGRID_API_KEY` |
| Stripe | Payments + subscriptions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Google OAuth | Calendar sync, future SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI (via Replit AI Integrations) | Daily challenge generation | Managed via integration |
| Replit Auth | "Login with Replit" | Managed via integration |

---

## 8. Out of Scope (current release)

- Live video streaming / real-time coaching sessions.
- In-app shot recognition from video (computer-vision drill scoring).
- Advanced recruiting marketplace (recruiter accounts, scholarship workflows).
- Tournament / league bracket management.
- Marketplace for trainer-published paid drill packs.
- Wearable / hardware integrations (motion sensors, smart-rims).
- Localization beyond English.

These are tracked in the feedback forum and may be planned for future releases.

---

## 9. Glossary

- **Drill** — A structured basketball exercise with instructions, video, and tracked metrics.
- **Training log** — A record of one completed drill or session, including stats.
- **Heatmap** — Visual half-court display of FG% by location.
- **Streak** — Consecutive days a player has completed the daily challenge.
- **Trophy** — An achievement unlocked by reaching a milestone.
- **Roster** — A trainer's collection of connected players.
- **Connection** — A mutually accepted relationship between two users (player/trainer, or peer/peer) that enables messaging.
- **Evaluation** — A trainer's structured rating of a player on configured skill attributes.
- **Career profile** — A player's lifetime stats and biographical information.
- **Film Room** — The user-uploaded video section of the app.

---

## 10. Acceptance Criteria — Production Readiness

A release is considered ready for production when all of the following pass:

- [ ] All affected routes return correct status codes for valid and invalid input.
- [ ] All forms validate input client-side and server-side.
- [ ] Health endpoint (`/api/health`) returns `200` with `dbReady: true`.
- [ ] No console errors on the dashboard, training-log, drills, or progress pages.
- [ ] iOS Capacitor build loads, authenticates, and fetches stats successfully.
- [ ] Push notifications deliver to a registered native device.
- [ ] Dark mode renders correctly on every page.
- [ ] Touch targets are ≥ 44×44 pt on mobile.
- [ ] Compression and long-cache headers are present on production responses.
- [ ] Deployment logs show no unhandled exceptions in the first 10 minutes after publish.

---

*End of document.*
# PLAYR1 — Product Requirements Document

**Product:** PLAYR1 — The Netflix for Basketball Training
**Document version:** 1.0
**Last updated:** April 17, 2026
**Status:** Live in production at `https://PLAYR1Basketball.replit.app`

---

## 1. Executive Summary

### 1.1 Vision
PLAYR1 is a comprehensive basketball training platform that gives players a complete, structured environment to develop their skills, track their growth, and connect with coaches and peers — modeled on the streaming-library experience of Netflix but built specifically around drill execution, performance tracking, and trainer collaboration.

### 1.2 Mission
Make professional-grade basketball development accessible to any player with a phone, while giving trainers and parents the tools to support, evaluate, and guide that development.

### 1.3 Core value proposition
- **For players:** A library of professional drills, a guided practice journal, visible progress over time, and a direct line to coaches.
- **For trainers:** A managed roster, drill assignment workflow, structured player evaluations, scheduled sessions, and a paid client management system.
- **For parents:** Visibility into a child's training without intruding on the player–coach relationship.
- **For the community:** Public profiles, shareable achievements, and a feedback loop into the product.

### 1.4 Platforms
- **Web app** — Responsive React/TypeScript single-page application.
- **iOS native app** — Capacitor-wrapped, distributed via App Store, loads from production URL with native push notifications and camera access.
- **Android native app** — Capacitor-configured (build pipeline ready).

---

## 2. User Personas & Roles

### 2.1 Player (primary)
A basketball player (typically middle-school through college, plus adult amateurs) who wants to improve specific skills, track practice consistency, and showcase development to coaches and recruiters.

### 2.2 Trainer / Coach
A basketball coach who manages a roster of players, prescribes workouts, evaluates performance, and books paid sessions.

### 2.3 Parent / Guardian
The parent of a minor player who wants visibility into the child's training activity, schedule, and evaluations without an active player account.

### 2.4 Admin
PLAYR1 staff who manage the global drill library, user accounts, content moderation, picklist values, and platform analytics.

### 2.5 Public visitor
Unauthenticated users browsing public player or trainer profiles, the marketing landing page, or shared achievement cards.

---

## 3. Functional Requirements

### 3.1 Authentication & Account Management

#### 3.1.1 Registration & login
- Email/password registration with email verification.
- Password hashing via `bcryptjs`.
- Stateless JWT authentication stored as an `httpOnly` cookie (`playr1_token`) on web; as a `Bearer` token in `localStorage` (`playr1_auth_token`) inside the iOS Capacitor app.
- "Login with Replit" SSO available (configured via `javascript_log_in_with_replit` integration).

#### 3.1.2 Password recovery
- "Forgot Password" flow sends a reset link via SendGrid.
- Time-limited single-use reset tokens.

#### 3.1.3 Onboarding wizard
On first login, new users complete:
- Role selection (Player / Trainer / Parent).
- Basic profile (name, avatar, location/zip code).
- Player-specific: grade, position, team affiliation, basketball goals.
- Trainer-specific: credentials, specialties, locations served.
- Parent-specific: invite or link to a child account.
- Avatar customization (skin tone, hair style via DiceBear).

#### 3.1.4 Account settings
- Profile editing, password change, email change, email-notification preferences, push-notification preferences, account deletion.

### 3.2 Drill Library

#### 3.2.1 Browse & search
- Searchable, filterable catalog of basketball drills, organized by category (shooting, ball-handling, passing, defense, conditioning, footwork, IQ).
- Each drill has: title, description, difficulty, duration estimate, required equipment, video tutorial, optional PDF guide, associated skill tags.

#### 3.2.2 Drill detail
- Embedded video player.
- Step-by-step instructions.
- "Start Drill" action that begins a guided training-log entry.
- Favorite / bookmark.

#### 3.2.3 User-generated drills
- Players and trainers can publish their own drills with uploaded videos.
- Trainer-published drills can be assigned to roster.
- Admins can promote user drills to the global library.

### 3.3 Training Log & Shot Tracking

#### 3.3.1 Session logging
- Player records every training session: drill performed, duration, sets, reps, perceived intensity (1–10), free-text notes.
- Sessions are timestamped (`completed_at`) for analytics.

#### 3.3.2 Shot tracking
- For shooting drills, players log makes / attempts.
- Shot **location** (e.g., corner three, left elbow, top of key, paint) and shot **type** (catch-and-shoot, off-the-dribble, free throw, layup) selected from admin-managed picklists.
- Locations are stored as half-court coordinates and rendered on a visual half-court chart.

#### 3.3.3 Bulk import
- CSV import for game stats from external sources (Hudl, MaxPreps): points, rebounds, assists, steals, blocks, FG/3PT/FT made/attempted, minutes.

### 3.4 Progress, Analytics & Visualization

#### 3.4.1 Dashboard
- At-a-glance summary: weekly training volume, current streak, recent achievements, daily challenge.

#### 3.4.2 Progress page
- **Stat cards** — totals for shots made/taken, drills completed, total minutes, weekly trend.
- **Shooting heatmap** — half-court visualization showing FG% by zone, color-graded.
- **Single configurable chart** — area chart with 11 selectable metrics (shots made, shots taken, threes, free throws, layups, mid-range, minutes, drills completed, FG%, 3PT%, mid-range%) and three time periods (weekly = last 7 days bucketed by day, monthly = current month bucketed by week, annual = Jan–Dec bucketed by month).
- **Empty state** for new users with CTAs to start a drill or log a session.

#### 3.4.3 Career page
- Lifetime stats, season-by-season breakdown, game log.
- XP and Level progression based on training activity.

#### 3.4.4 Trophy Room
- Achievements unlocked through milestones (first 100 makes, 7-day streak, 30-day streak, X drills completed in a category, etc.).
- Each trophy displays unlock date and is shareable.

### 3.5 Daily Streak Challenge
- A globally unique drill is generated **once per day** by GPT (via OpenAI integration) — every user worldwide sees the same drill that day.
- Players earn streak credit for completing the day's challenge.
- Streak history view shows past challenges and completion record.
- XP rewards scale with streak length.

### 3.6 Film Room (User Video Uploads)

#### 3.6.1 Upload
- Players upload videos of workouts or game film up to **4 GB** per file (client-side limit enforced).
- Two-step upload flow: request signed URL → direct upload to object storage → finalize.
- FFmpeg post-processing on the server: pass 1 attempts `-c:v copy -c:a aac -movflags +faststart`; pass 2 fallback re-encodes via `libx264` + `aac` for compatibility (fixes DaVinci Resolve LPCM audio that iOS can't play).

#### 3.6.2 Management
- Personal video library, set privacy (private / shared with trainer / public on profile).
- Trainer comment thread on shared videos.

### 3.7 Public Profiles & Discovery

#### 3.7.1 Player profile (`/player/:id`)
- Public-facing: bio, position, team, highlight videos, achievements, season stats, shareable link.
- Privacy controls: profile can be private, public, or visible only to connected trainers.

#### 3.7.2 Trainer profile (`/trainer/:id`)
- Bio, credentials, specialties, locations, hourly rate, availability, reviews, video samples, booking CTA.

#### 3.7.3 Finder
- Browse trainers and players by location (zip-code geocoding via the `zipcodes` package), skill, role, or name.

### 3.8 Trainer Mode

#### 3.8.1 Roster management
- View all assigned/connected players.
- Add players via universal invite system (link or email).
- Remove or archive players.

#### 3.8.2 Drill assignments
- Assign drills or workouts (sequenced drills) to individual players or groups.
- Set due dates and notes.
- Track completion in real time.

#### 3.8.3 Player evaluations
- Rate players on configurable skill attributes (IQ, athleticism, defense, shooting, ball-handling, leadership, etc.) on a 1–10 scale.
- Attribute set is admin-managed.
- Evaluations are versioned over time so a player can see growth trajectory.

#### 3.8.4 Group chat
- Create chat groups (e.g., team, training group) and message all members.

### 3.9 Bookings & Sessions

#### 3.9.1 Session booking
- Players browse a trainer's profile and request a session at a specific time/location.
- Trainer accepts, declines, or proposes alternative.
- Group sessions (multiple players, single trainer) supported.
- Reschedule and cancellation flows with policy enforcement.

#### 3.9.2 Google Calendar sync
- Trainers can connect Google Calendar (via `googleapis`).
- Confirmed sessions are pushed to the trainer's calendar; reschedules and cancellations propagate.

#### 3.9.3 Payment
- Stripe-powered checkout for one-time session payments and (future) recurring subscriptions.
- Integrated via the `stripe` Node SDK and `stripe-replit-sync` for DB synchronization.
- Payment confirmation triggers session-confirmation flow.

### 3.10 Communication

#### 3.10.1 Direct messaging
- 1:1 chat between connected users.
- Connections require an explicit request/accept handshake (universal connection system).

#### 3.10.2 Group chat
- Trainer-created groups for teams or training cohorts.

#### 3.10.3 Notifications
- **Email** — critical events (session confirmation, password reset, account changes) via SendGrid.
- **Web push** — VAPID-based push for browser users.
- **Native push** — APNs / FCM token registration for iOS / Android via Capacitor.
- **In-app notification center** showing unread events.

### 3.11 Parent / Guardian Mode

- Parent invites a minor child by email; child accepts or is invited via parent-created account.
- Parent dashboard shows the child's: recent training activity, evaluations, upcoming sessions, achievements.
- Optional **parent visibility toggle** that the player or trainer can adjust.
- Parents cannot log training, message non-connected users, or modify the child's account.

### 3.12 Feedback Forum
- Public-facing forum at `/feedback` for feature suggestions and bug reports.
- Users can submit, browse, **upvote**, and comment on entries.
- Admins triage and update status (planned, in-progress, shipped, declined).

### 3.13 Admin Dashboard

#### 3.13.1 Content management
- Drill library: create, edit, delete, categorize, attach videos and PDFs.
- Video library and PDF library (resources independent of drills).
- Picklists: shot locations (with court coordinates), shot types, evaluation attributes, metric templates.

#### 3.13.2 User management
- Search users, view profiles, grant/revoke admin, suspend accounts.
- Admin status verified via `storage.isUserAdmin(userId)` — never read from `users.role` directly.

#### 3.13.3 Analytics dashboard
- Platform metrics: DAU/WAU/MAU, sign-ups, session counts, drill popularity, completion rates, retention cohorts.

### 3.14 iOS Native App (Capacitor)

- Bundle ID: `com.playr1.training`, app name: "PLAYR1 Training".
- Loads from `https://PLAYR1Basketball.replit.app` (production server).
- Native splash: 500ms, dark background `#0a0a0a`, no spinner.
- Native push notifications (badge, sound, alert).
- Native camera access for Film Room recording.
- Status bar styled to match dark theme.
- Bearer-token auth (no cookies on iOS WebView).
- Safe-area insets respected throughout the UI.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Time-to-interactive on cold load:** target ≤ 2.5 s on a 4G connection.
- **Tab navigation:** ≤ 100 ms perceived latency (achieved via per-page chunk preloading on hover/touch + idle-time warm-up of common pages).
- **API response compression:** all responses > 1 KB are gzip/brotli compressed.
- **Static asset caching:** hashed JS/CSS/font assets served with `Cache-Control: public, max-age=31536000, immutable`; `index.html` is `no-store` to prevent stale-bundle issues on iOS WebView.
- **Image optimization:** below-the-fold images use `loading="lazy"` and `decoding="async"`; hero images use `decoding="async"` + `fetchPriority="high"`.

### 4.2 Availability & Reliability
- **Health check endpoint:** `GET /api/health` returns `200 {status, uptimeSeconds, dbLatencyMs, dbReady, timestamp}` on success or `503` on failure. Used for uptime monitoring and post-deploy verification.
- **Database connection:** uses `@neondatabase/serverless` driver with WebSocket transport (required for Neon serverless Postgres which scales compute to zero on idle).
- **Pool configuration:** max 10 connections, 30 s idle timeout, 10 s connection timeout, error event handler attached.
- **Graceful degradation:** UI shows skeleton/empty states when data is unavailable rather than crashing.
- **Production isolation:** dev workspace and production deployment are fully isolated environments with separate databases.

### 4.3 Security
- **Authentication:** JWT with httpOnly + Secure + SameSite cookie on web; Bearer token in iOS Keychain-backed storage.
- **Authorization:** role checks server-side on every protected endpoint; admin status checked via `storage.isUserAdmin()`.
- **Rate limiting:**
  - Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`): 20 requests / 15 minutes per IP.
  - All other API endpoints: 120 requests / minute per IP.
- **Input validation:** all request bodies validated with Zod schemas derived from `drizzle-zod`.
- **Password storage:** `bcryptjs` with appropriate work factor.
- **Object storage:** signed URLs for uploads; private files served only to authorized users via `getObjectUrl`.
- **CORS:** restricted to capacitor:// and ionic:// origins for native, same-origin for web.
- **Secrets management:** all credentials in environment variables; never committed.

### 4.4 Privacy
- Minor players' profiles default to private.
- Parent visibility is opt-in/opt-out per player.
- Public profile fields are explicitly chosen by the user.
- Account deletion removes personal data; aggregate analytics may persist anonymized.

### 4.5 Accessibility
- Color contrast meets WCAG AA on the dark theme.
- All interactive elements keyboard-navigable.
- Form inputs labeled; error messages associated via `aria-describedby`.
- Touch targets ≥ 44×44 pt on mobile.
- Dialogs include `DialogTitle` and `DialogDescription` (radix accessibility primitives).

### 4.6 Browser & Device Support
- **Browsers:** latest two major versions of Chrome, Safari, Firefox, Edge.
- **iOS:** 15.0+ (Capacitor 8 requirement).
- **Android:** API 23+ (Capacitor 8 requirement).
- **Mobile-first responsive design** with safe-area-inset handling.

### 4.7 Internationalization
- English only at launch. Architecture supports future i18n via React component-level string extraction.

### 4.8 Observability
- Structured request logging in production (`[express] METHOD path STATUS in Nms`).
- Error logging to deployment-log stream.
- Health endpoint for external monitor integration (UptimeRobot, BetterStack, etc.).

---

## 5. Data Model (high-level)

Stored in PostgreSQL via Drizzle ORM. Source of truth: `shared/schema.ts`.

| Domain | Key tables |
|---|---|
| Identity | `users`, `sessions`, `password_reset_tokens` |
| Profiles | `user_profiles`, `career_profiles`, `trainer_profiles`, `player_profiles`, `trainer_profile_locations`, `training_locations` |
| Connections | `player_trainer_connections`, `trainer_player_assignments`, `parent_child_relationships` |
| Teams | `team_clubs`, `leagues`, `trainer_teams`, `seasons`, `games` |
| Drills & Library | `drills`, `drill_metrics`, `drill_metric_templates`, `video_library`, `pdf_library`, `trainer_videos` |
| Training | `training_logs`, `training_log_metrics`, `metric_templates` |
| Shooting | `shot_locations`, `shot_types`, training-log shot rows |
| Challenges | `challenges`, daily challenge generation cache |
| Sessions | `training_sessions`, session-confirmation state |
| Messaging | `messages`, group/chat threads |
| Evaluations | `player_evaluations`, `evaluation_attributes` |
| Achievements | trophies / unlocked achievements |
| Feedback | `feedback`, `feedback_comments`, votes |
| Admin | admin flags, picklist tables |
| Push | `push_subscriptions`, native device tokens |

All schemas export: the table, an `insert` schema (`createInsertSchema(...).omit(...)`), an `Insert` type, and a `Select` type. Frontend and backend share this single source of truth via the `@shared` alias.

---

## 6. Technical Architecture

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Frontend build | Vite |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Forms | react-hook-form + zod resolver |
| UI components | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS, dark mode by default, orange (`#F97316`) primary |
| Icons | lucide-react, react-icons/si for brand logos |
| Backend | Node.js + Express |
| Database | PostgreSQL on Neon Serverless |
| ORM | Drizzle |
| Auth | bcryptjs + jsonwebtoken + cookie-parser |
| File storage | Replit App Storage (Google Cloud Storage backend) |
| Email | SendGrid |
| Push | web-push (VAPID) + native APNs/FCM via Capacitor |
| Payments | Stripe + stripe-replit-sync |
| Calendar | googleapis (Google Calendar) |
| AI | OpenAI via Replit AI Integrations (daily challenge generation) |
| Image generation | DiceBear (avatars) |
| Geocoding | `zipcodes` package |
| Mobile | Capacitor 8 (iOS + Android) |
| Video processing | ffmpeg |

### 6.2 Project structure
```
client/src/        — React frontend (pages, components, hooks, lib)
  pages/           — Route components
  components/      — Shared UI (sidebar, dialogs, charts, etc.)
  lib/
    pageLoaders.ts — Centralized lazy chunk loaders + preload helpers
    queryClient.ts — TanStack Query client + nativeFetch + getObjectUrl
shared/            — Code shared between client & server
  schema.ts        — Drizzle tables, Zod insert schemas, types
  models/          — Domain model exports
server/            — Express backend
  index.ts         — App bootstrap, middleware (compression, rate limit, CORS)
  routes.ts        — All API route definitions
  storage.ts       — IStorage interface + DB CRUD implementations
  db.ts            — Database pool + Drizzle instance
  auth.ts          — JWT + cookie auth
  static.ts        — Production static asset serving with cache headers
  replit_integrations/ — Object storage, auth, chat integrations
ios/               — Native iOS Capacitor project
docs/              — Documentation (this file)
```

### 6.3 API conventions
- All API routes are namespaced under `/api/`.
- Storage CRUD goes through the `IStorage` interface in `server/storage.ts`; routes stay thin.
- Request bodies validated against Zod schemas before reaching storage.
- Authenticated routes use `isAuthenticated` middleware which populates `req.user`.
- Admin routes additionally verify `storage.isUserAdmin(userId)`.

### 6.4 Critical implementation rules (developer-facing)
- All client-side `queryFn` and API calls must use `nativeFetch` from `@/lib/queryClient` — raw `fetch` breaks on iOS Capacitor.
- All image / video / avatar `src` attributes must go through `getObjectUrl` to resolve object-storage paths correctly on both web and native.
- Bulk-save routes must be declared **before** parameterized `:id` routes to avoid the wrong handler matching.
- New lazy pages must be registered in `client/src/lib/pageLoaders.ts` and added to the `routeToLoader` map for hover-preload to work.

### 6.5 Deployment & operations
- **Production:** Replit Deployment serving from `https://PLAYR1Basketball.replit.app` — fully isolated from the dev workspace, with its own database.
- **Publishing model:** code changes only reach production when the user explicitly clicks "Publish". Dev work has zero impact on live users.
- **Rollback:** previous deployments restorable from the Deployments tab.
- **Database migrations:** managed via `drizzle-kit push`. Never hand-write `ALTER TABLE` statements; never change primary-key column types.
- **Test accounts (production):**
  - `reviewer@playr1.app` / `Review2026!`
  - `nvnaso@outlook.com` / `Playr1Admin!`

---

## 7. Integrations

| Service | Purpose | How configured |
|---|---|---|
| Replit App Storage | Media uploads (videos, images, PDFs, avatars) | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |
| SendGrid | Transactional email | `SENDGRID_API_KEY` |
| Stripe | Payments + subscriptions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` |
| Google OAuth | Calendar sync, future SSO | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI (via Replit AI Integrations) | Daily challenge generation | Managed via integration |
| Replit Auth | "Login with Replit" | Managed via integration |

---

## 8. Out of Scope (current release)

- Live video streaming / real-time coaching sessions.
- In-app shot recognition from video (computer-vision drill scoring).
- Advanced recruiting marketplace (recruiter accounts, scholarship workflows).
- Tournament / league bracket management.
- Marketplace for trainer-published paid drill packs.
- Wearable / hardware integrations (motion sensors, smart-rims).
- Localization beyond English.

These are tracked in the feedback forum and may be planned for future releases.

---

## 9. Glossary

- **Drill** — A structured basketball exercise with instructions, video, and tracked metrics.
- **Training log** — A record of one completed drill or session, including stats.
- **Heatmap** — Visual half-court display of FG% by location.
- **Streak** — Consecutive days a player has completed the daily challenge.
- **Trophy** — An achievement unlocked by reaching a milestone.
- **Roster** — A trainer's collection of connected players.
- **Connection** — A mutually accepted relationship between two users (player/trainer, or peer/peer) that enables messaging.
- **Evaluation** — A trainer's structured rating of a player on configured skill attributes.
- **Career profile** — A player's lifetime stats and biographical information.
- **Film Room** — The user-uploaded video section of the app.

---

## 10. Acceptance Criteria — Production Readiness

A release is considered ready for production when all of the following pass:

- [ ] All affected routes return correct status codes for valid and invalid input.
- [ ] All forms validate input client-side and server-side.
- [ ] Health endpoint (`/api/health`) returns `200` with `dbReady: true`.
- [ ] No console errors on the dashboard, training-log, drills, or progress pages.
- [ ] iOS Capacitor build loads, authenticates, and fetches stats successfully.
- [ ] Push notifications deliver to a registered native device.
- [ ] Dark mode renders correctly on every page.
- [ ] Touch targets are ≥ 44×44 pt on mobile.
- [ ] Compression and long-cache headers are present on production responses.
- [ ] Deployment logs show no unhandled exceptions in the first 10 minutes after publish.

---

*End of document.*
