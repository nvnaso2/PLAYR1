# PLAYR1 Basketball Training Platform

## Overview
PLAYR1 is a "Netflix for basketball drills" platform aimed at providing a comprehensive basketball training experience. It allows users to access professional training videos, log practice sessions, track progress, upload personal training videos, and benchmark performance within a community. The platform focuses on skill development and community engagement, offering a vast library of drills, progress tracking, user-generated content capabilities, and social features.

## User Preferences
- I prefer clear and concise explanations.
- I like an iterative development process, where I can provide feedback frequently.
- Please ask for my approval before implementing major changes or architectural decisions.
- Focus on delivering functional features quickly.
- Ensure the user interface is intuitive and user-friendly.

## System Architecture
The platform is built with a modern web stack: React + TypeScript for the frontend, an Express.js backend, and a PostgreSQL database with Drizzle ORM. Authentication uses custom email/password with bcrypt password hashing and stateless JWT tokens stored as httpOnly cookies. The `isAuthenticated` middleware verifies the JWT and sets `req.user = { claims: { sub: userId } }` for backward compatibility with all existing routes. Auth module: `server/auth.ts`. Frontend auth pages: `/auth` (login/register), `/forgot-password`, `/reset-password`. Styling uses Tailwind CSS and shadcn/ui components, featuring an orange primary color and dark mode by default. The design ensures mobile accessibility via Capacitor for native iOS and Android apps.

**Key Features:**

*   **Drill Library & Training Log**: Extensive drill library with dynamic metric inputs, detailed shot location tracking, and visual half-court shot charts.
*   **Progress Tracking & Achievements**: Visualizes improvement with charts, analytics, shooting heatmaps, and a "Trophy Room" for tracking achievements, challenges, and personal records.
*   **User-Generated Content**: Users can create custom drills and upload personal training videos.
*   **Community & Social Features**: Enables performance comparison, customizable public player profiles, and shareable social media cards.
*   **Admin Dashboard**: Comprehensive management of drills, videos, resources, metric templates, and user accounts.
*   **Coach / Trainer Mode**: Role-based interface with dedicated routes for trainers. Sidebar items: Home, Player Management, Drills & Workouts, Chat, Schedule, Evaluations, Trainer Profile. Player Management at `/trainer/roster` with Team/Group/Position/Age filters. Find Players button for searching/connecting with players via `GET /api/players/search?q=...`. Player cards have quick action buttons (Chat, Assign Drill, Invite, Edit, Delete) and navigate to a dedicated Player Detail Page at `/trainer/roster/:playerId` with 8 tabs: Overview, Evaluations, Drills, Sessions, Logs, Videos, Chat, Progress. Drills & Workouts page includes tabs: All Drills, My Drills, Workouts, Assignments, Videos (consolidated from separate Videos page). API endpoints: `GET /api/trainer/players/:playerId/(assignments|videos|messages|training-logs|sessions|evaluations|progress)`.
*   **Group Chat**: Supports team-based, position-based, and custom group conversations.
*   **Onboarding Wizard**: Multi-step, role-based onboarding process for players and trainers, including profile creation and interest/specialty selection.
*   **Tutorial Videos**: Admin-managed video tutorials integrated into the onboarding flow.
*   **Teams & Leagues**: Consolidated page for finding teams/leagues and managing player's own team memberships. Location-based distance filtering using zip code from onboarding (default 25mi radius, adjustable: 10/25/50/100/250mi/Any). Geo utility: `server/geo.ts` with `zipToCoords`, `haversineDistance` using `zipcodes` package. `user_profiles`, `team_clubs`, `leagues`, `trainer_profiles` have `latitude`/`longitude` columns. API endpoints accept `lat/lng/radius` params for in-memory Haversine filtering; state/city filters used as fallback when no location. `GET /api/user/location` returns user's coordinates.
*   **My Trainer**: Consolidated player page for finding trainers, viewing assigned drills, managing sessions, viewing evaluations, and direct messaging with trainers. The "My Drills" tab shows drills assigned by trainers with Mark Complete/Practice actions. Players can favorite trainers (heart icon) and designate one as "My Trainer" (badge shown on card). DB table: `player_trainer_favorites` (playerId, trainerId, isMyTrainer). API: `GET/POST/DELETE /api/player/trainer-favorites/:trainerId`, `POST/DELETE /api/player/my-trainer/:trainerId`.
*   **Trainer Profile Builder**: Trainers can create detailed public profiles including availability, specialties, rates, and training locations. Two profile pages: "PLAYR1 Profile" (`/profile`, `user_profiles` table) for account/identity and "Trainer Profile" (`/trainer/profile`, `trainer_profiles` table) for professional details. Shared fields (photo, city, state) sync bidirectionally between both tables on save.
*   **Session Scheduling**: Full booking flow for training sessions between players and trainers, including requesting, confirming, rescheduling, and cancelling sessions. Supports multi-player group sessions (trainers can create sessions for multiple players at once via `POST /api/training-sessions/group`; linked by `groupSessionId` in `training_sessions` table).
*   **Google Calendar Integration**: OAuth-based Google Calendar sync for confirmed training sessions. Users connect their Google account via popup OAuth flow, then can add confirmed sessions to Google Calendar with one click. DB table: `google_calendar_tokens` (userId, accessToken, refreshToken, expiresAt). Backend module: `server/google-calendar.ts`. Hook: `client/src/hooks/use-google-calendar.ts`. API: `GET /api/google-calendar/status`, `GET /api/google-calendar/connect`, `GET /api/auth/google/callback`, `POST /api/google-calendar/disconnect`, `POST /api/google-calendar/add-session/:sessionId`.
*   **Player Evaluations**: Trainers can rate player skill attributes using configurable scales (numeric and word ratings), with support for custom attributes and progress tracking.
*   **Email Notifications (SendGrid)**: Automated email notifications sent from `noreply@handlz.co` for session lifecycle events (requested, confirmed, cancelled, rescheduled, declined) and welcome emails on onboarding completion. Backend module: `server/email.ts`. Email field added to `user_profiles` table. Users set their email on the Profile page.
*   **Universal Connect & Find People**: Connection request system that gates chat access. Any user can connect with any other user (player-player, player-trainer, trainer-trainer). Universal search via `GET /api/users/search?q=...` returns all users with role info. Players access "Find People" page at `/connect`; trainers use "Find People" dialog in Player Management. Connections stored with lexicographic ID ordering (`playerId=min, trainerId=max`) and `requesterUserId` for authorization. Invite by email via `POST /api/invite` + SendGrid when no results found. DB table: `player_trainer_connections` (playerId, trainerId, status: pending/accepted/declined, initiatedBy: player/trainer, requesterUserId). API: `POST /api/connections/request`, `GET /api/connections`, `GET /api/connections/pending`, `GET /api/connections/status/:otherUserId`, `PUT /api/connections/:id/accept`, `PUT /api/connections/:id/decline`, `POST /api/invite`.
*   **Parent/Guardian Visibility**: For players under 18 (determined by birthYear during onboarding), a parent/guardian email is collected. A `parentInviteCode` is auto-generated on onboarding completion. Parents create their own account, link via invite code, and get read-only visibility into their child's training activity, sessions, messages, and trainer connections. DB tables: `parent_links` (parentUserId, playerUserId), `career_profiles` fields: `isMinor`, `parentEmail`, `parentInviteCode`. Parent dashboard at `/parent`. API: `POST /api/parent/link`, `GET /api/parent/children`, `GET /api/parent/child/:childId/activity`, `GET /api/parent/child/:childId/messages`, `GET /api/parent/child/:childId/connections`.
*   **Push Notifications (Web Push)**: Browser/PWA push notifications via VAPID/web-push for key events: session lifecycle (requested, confirmed, declined, cancelled, rescheduled), new messages (direct and thread), connection requests/accepts, drill assignments. Service worker at `client/public/sw.js`. Backend module: `server/push.ts`. Hook: `client/src/hooks/use-push-notifications.ts`. Toggle on Profile page. DB table: `push_subscriptions` (userId, endpoint, p256dh, auth). API: `GET /api/push/vapid-key`, `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`. Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
*   **Payments (Stripe)**: Integrated via Replit Stripe connector with `stripe-replit-sync` for automatic data sync. Stripe schema managed automatically in PostgreSQL. Backend modules: `server/stripeClient.ts` (credentials, StripeSync singleton), `server/webhookHandlers.ts` (webhook processing). Webhook route registered BEFORE `express.json()` in `server/index.ts`. `users` table has `stripe_customer_id` and `stripe_subscription_id` columns. API: `GET /api/stripe/publishable-key`, `GET /api/stripe/products`, `GET /api/stripe/subscription`, `POST /api/stripe/checkout` (subscription), `POST /api/stripe/customer-portal`, `POST /api/stripe/session-payment` (one-time session booking). Products created via Stripe API/Dashboard, synced automatically via webhooks + `syncBackfill()` on startup.

## External Dependencies
*   **Custom Auth (bcryptjs + jsonwebtoken)**: Email/password authentication with JWT cookies. Supports register, login, logout, forgot/reset password.
*   **cookie-parser**: Parses httpOnly JWT cookies for authentication.
*   **PostgreSQL**: Database.
*   **Drizzle ORM**: Database interactions.
*   **Vite**: Frontend build tool.
*   **Wouter**: Client-side routing.
*   **TanStack Query**: Data fetching and caching.
*   **Tailwind CSS**: Styling.
*   **shadcn/ui**: UI components.
*   **html2canvas**: Generating social media share card images.
*   **Capacitor**: Building native mobile applications.
*   **Replit App Storage**: Object storage for media uploads.
*   **googleapis**: Google Calendar API integration.
*   **@sendgrid/mail**: Email delivery via SendGrid.
*   **zipcodes**: Zip code to lat/lng geocoding for distance filtering.
*   **web-push**: Web Push API (VAPID) for browser push notifications.
*   **stripe**: Official Stripe SDK for payment operations.
*   **stripe-replit-sync**: Automatic Stripe data sync to PostgreSQL via webhooks.