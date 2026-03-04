# PLAYR1 Basketball Training Platform

## Overview
PLAYR1 is a "Netflix for basketball drills" platform featuring Handlz branded drill content. It enables users to access professional training videos, log practice sessions, track progress, upload personal training videos, and benchmark their performance against a community of peers. The platform aims to provide a comprehensive basketball training experience, fostering skill development and community engagement.

## User Preferences
- I prefer clear and concise explanations.
- I like an iterative development process, where I can provide feedback frequently.
- Please ask for my approval before implementing major changes or architectural decisions.
- Focus on delivering functional features quickly.
- Ensure the user interface is intuitive and user-friendly.

## System Architecture
The platform is built with a modern web stack, utilizing React + TypeScript for the frontend, an Express.js backend, and a PostgreSQL database with Drizzle ORM. Authentication is handled via Replit Auth (OIDC). Styling is managed with Tailwind CSS and shadcn/ui components, adhering to a basketball-inspired theme with an orange primary color and dark mode enabled by default.

**Key Features:**

*   **Drill Library & Training Log**: Offers a vast library of 500+ drills across seven categories. Users can select multiple drills for a workout, track duration, scores, and notes, with dynamic and validated metric inputs. Specific features include detailed shot location tracking and a visual half-court shot chart for shooting drills.
*   **Progress Tracking & Achievements**: Provides charts and analytics to visualize improvement over time, including a shooting heatmap. A "Trophy Room" system tracks achievements, challenges (app-generated or user-created with various metrics and goal types), personal records, and team awards.
*   **User-Generated Content**: Users can create their own custom drills and upload personal training videos.
*   **Community & Social Features**: Allows users to compare performance against peers of the same age, maintain public player profiles with customizable visibility, and generate shareable social media cards for game stats.
*   **Admin Dashboard**: A comprehensive dashboard for administrators to manage drills, video content, PDF resources, metric templates, and user accounts with full CRUD operations.
*   **Coach / Trainer Mode**: Role-based experience with dedicated routes under `/trainer/*`. Each trainer page is a standalone component in `client/src/pages/trainer/`. Trainers see a separate sidebar with trainer-specific navigation. Users with `staffRole="both"` get a Player/Trainer toggle in the sidebar header to switch views. Player view shows standard player features (Dashboard, Career, Drills, Training Log, Filmroom).
    - **Trainer Pages** (each is a self-contained file in `client/src/pages/trainer/`):
      - `/trainer` → `index.tsx` — Home: overview stat cards (Total Players, Active Assignments, Recent Logs, Unread Messages), recent activity feed, quick action buttons
      - `/trainer/roster` → `roster.tsx` — Unified Roster: tabbed view with Teams, Groups, All Players tabs. Full CRUD for teams/groups, player management, team code sharing for invites
      - `/trainer/drills` → `drills.tsx` — Drills & Workouts: 4 sub-tabs (All Drills browse/search/filter, My Drills CRUD, Workouts builder with drill selection/reorder/assign, Assignments list)
      - `/trainer/logs` → `logs.tsx` — Training Logs: merged view of all player logs from teams and groups, searchable/filterable by player/drill/category
      - `/trainer/videos` → `videos.tsx` — Videos: 2 tabs (My Videos for trainer instructional content CRUD, Player Videos for submitted content)
      - `/trainer/chat` → `chat.tsx` — Messaging
      - `/trainer/progress` → `progress.tsx` — Player Progress: player selector, summary cards, weekly activity chart (CSS bars), category breakdown, recent logs table, assignment completion progress bar
      - `/trainer/profile` → `profile.tsx` — Trainer Profile Builder with preview
    - Legacy `/coach` URLs and old routes (`/trainer/players`, `/trainer/assignments`, `/trainer/invite`) redirect to appropriate new routes
    - The `useRole` hook (`client/src/hooks/use-role.ts`) manages role detection and view switching with localStorage persistence
    - Backend APIs: `GET /api/trainer/overview`, `GET/POST/PUT/DELETE /api/trainer/drills`, `GET/POST/PUT/DELETE /api/workouts/*`, `POST /api/workouts/:id/assign`, `GET /api/trainer/players/:playerId/progress`, `GET /api/trainer/all-training-logs`, `GET /api/trainer/all-videos`, etc.
*   **Group Chat**: Chat threads support team-based, position-based, and custom group conversations. Schema uses chatThreads, chatThreadMembers, chatThreadMessages tables with mode (coach/trainer) separation.
*   **Onboarding Wizard**: Multi-step onboarding flow with role-based branching. **Player flow**: Role Selection → Player Profile (photo, name, birth date, grade, teams, positions, jersey, aspiration) → Rank Interests (drag-and-drop) → Branched sub-flows (Skill Development, Game Stats, etc.). **Trainer flow**: Role Selection → Trainer Profile (photo, name, "also coach?" toggle with team name field) → Rank Specialties (drag-and-drop: Ball Handling, Shooting, Defense, S&C, Basketball IQ, Finishing, Passing) → "Where do you want to begin?" (Create a Drill/Workout, Create Trainee Roster/Invite Players, Upload Content). DB fields: `primaryReason` (JSON array), `onboardingTeams` (JSON array), `trainerSpecialties` (JSON array of ranked specialties), `trainerAlsoCoaches` (boolean), `trainerTeamName` (varchar). Tutorial video steps play admin-uploaded videos keyed by `log-training` and `create-drill` from the `tutorial_videos` table.
*   **Tutorial Videos**: Admin-managed tutorial videos stored in `tutorial_videos` table with unique `key` identifiers. Admin dashboard has a "Tutorials" tab for uploading/replacing/removing tutorial videos. Videos play inline during onboarding when users choose "View Tutorial". API: `GET/PUT/DELETE /api/tutorial-videos/:key`.
*   **Find a Trainer**: Player-facing directory at `/find-trainer` to browse public trainer profiles. Filterable by state, specialty, and keyword search. Clicking a trainer opens a detail panel with bio, specialties, rates, availability, certifications, and contact info. API: `GET /api/trainers/directory` (public, filterable), `GET /api/trainers/directory/:id`.
*   **Trainer Profile Builder**: Trainers build their public profile at `/trainer/profile`. Clean single-column display layout with avatar, name, headline, rate/experience/certifications highlights, about section, specialties/session type badges, structured availability schedule (day-of-week picker with time ranges stored as JSON), training locations with per-location availability, and contact grid. Edit via side Sheet panel with photo upload, public/hidden toggle, and all form fields. Fields include headline, bio, specialties (from TRAINER_SPECIALTIES), session types, location (city/state), hourly rate, experience years, certifications, availability (JSON structured schedule), training locations (linked from admin-managed list with per-location availability), contact info, and social links. Public/hidden toggle controls visibility in the directory. DB tables: `trainer_profiles`, `training_locations` (admin-managed), `trainer_profile_locations` (join table with per-location availability JSON). API: `GET /api/trainer-profile`, `PUT /api/trainer-profile`, `GET/POST/PUT/DELETE /api/training-locations` (admin CRUD), `GET/POST/PUT/DELETE /api/trainer-profile/locations` (trainer linking).
*   **Session Scheduling**: Full booking flow for training sessions. Players request sessions from the "Find a Trainer" directory, trainers manage requests from a dedicated Schedule page. Statuses: requested → confirmed/declined → completed/cancelled. DB table: `training_sessions` (trainerId, playerId, trainerProfileId, locationId, sessionDate, startTime, endTime, status, playerNotes, trainerNotes, declineReason, sessionType). Player page: `/my-sessions`. Trainer page: `/trainer/schedule` (Requests tab + Schedule tab with Calendar and List views). Calendar view shows monthly grid with session indicators, clickable dates to see day details. List view shows all sessions sortable by date, day, time, and location. Booking dialog in Find a Trainer is availability-aware: fetches trainer detail data with locations via `GET /api/trainers/directory/:id`, lets players pick a training location, shows per-location available days, and filters time slots to match the trainer's availability schedule. When a date is unavailable, time selects are disabled and submission is blocked. Trainer Home dashboard shows "Pending Requests" stat card + "View Schedule" quick action. API: `POST /api/training-sessions`, `GET .../player/enriched`, `GET .../trainer/enriched`, `PUT .../:id/confirm`, `PUT .../:id/decline`, `PUT .../:id/cancel`, `PUT .../:id/complete`.
*   **Payments (Stripe)**: Placeholder for Stripe Connect integration. The `trainer_profiles` table has a `stripeAccountId` field reserved for when Stripe is connected. The Stripe connector integration needs to be authorized by the user before payment functionality can be enabled.
*   **Mobile Support**: The platform is designed to be accessible via native iOS and Android apps using Capacitor, ensuring a touch-friendly and responsive experience with platform-specific configurations.

**Technical Implementations:**

*   **Database Schema**: A well-defined PostgreSQL schema manages users, drills, training logs, user-generated content, progress data, challenges, and team/group-related information.
*   **API Design**: A RESTful API provides endpoints for all major functionalities, with clear distinctions for user and admin actions.
*   **File Uploads**: Secure direct-to-storage uploads for videos, images, and PDFs are handled via presigned URLs using Replit's App Storage, supporting various file types and size limits.

## External Dependencies
*   **Replit Auth**: For user authentication (OIDC).
*   **PostgreSQL**: Relational database management system.
*   **Drizzle ORM**: Object-Relational Mapper for database interactions.
*   **Vite**: Frontend build tool.
*   **Wouter**: Client-side routing for React.
*   **TanStack Query**: Data fetching and caching library.
*   **Tailwind CSS**: Utility-first CSS framework.
*   **shadcn/ui**: UI component library.
*   **html2canvas**: For generating PNG downloads of social media share cards.
*   **Capacitor**: For building native iOS and Android applications.
*   **Replit App Storage**: For object storage of uploaded media (videos, thumbnails, PDFs).