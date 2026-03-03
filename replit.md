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
*   **Coach / Trainer Mode**: Role-based experience with dedicated routes under `/trainer/*`. Trainers see a separate sidebar with trainer-specific navigation: Home, Roster, Drills & Workouts, Training Logs, Videos, Chat, Player Progress. Users with `staffRole="both"` get a Player/Trainer toggle in the sidebar header to switch views. Player view shows standard player features (Dashboard, Career, Drills, Training Log, Filmroom). Trainer routes: `/trainer` (Home — overview stats, recent activity, quick actions), `/trainer/roster` (unified teams/groups/players/invite management), `/trainer/drills` (All Drills/My Drills/Workouts builder/Assignments tabs), `/trainer/logs` (training logs), `/trainer/videos` (trainer content + player submissions), `/trainer/chat` (messaging), `/trainer/progress` (per-player analytics with charts). Legacy `/coach` URLs and old trainer routes (`/trainer/players`, `/trainer/assignments`, `/trainer/invite`) redirect to appropriate new routes. The `useRole` hook (`client/src/hooks/use-role.ts`) manages role detection and view switching with localStorage persistence. Core trainer functionality lives in `client/src/pages/trainer-page.tsx` with dedicated pages in `client/src/pages/trainer/`. Backend APIs: `GET /api/trainer/overview` (dashboard stats), `POST /api/workouts/:id/assign` (assign workout drills to team), `GET /api/trainer/players/:playerId/progress` (player analytics).
*   **Group Chat**: Chat threads support team-based, position-based, and custom group conversations. Schema uses chatThreads, chatThreadMembers, chatThreadMessages tables with mode (coach/trainer) separation.
*   **Onboarding Wizard**: Multi-step onboarding flow with role-based branching. **Player flow**: Role Selection → Player Profile (photo, name, birth date, grade, teams, positions, jersey, aspiration) → Rank Interests (drag-and-drop) → Branched sub-flows (Skill Development, Game Stats, etc.). **Trainer flow**: Role Selection → Trainer Profile (photo, name, "also coach?" toggle with team name field) → Rank Specialties (drag-and-drop: Ball Handling, Shooting, Defense, S&C, Basketball IQ, Finishing, Passing) → "Where do you want to begin?" (Create a Drill/Workout, Create Trainee Roster/Invite Players, Upload Content). DB fields: `primaryReason` (JSON array), `onboardingTeams` (JSON array), `trainerSpecialties` (JSON array of ranked specialties), `trainerAlsoCoaches` (boolean), `trainerTeamName` (varchar). Tutorial video steps play admin-uploaded videos keyed by `log-training` and `create-drill` from the `tutorial_videos` table.
*   **Tutorial Videos**: Admin-managed tutorial videos stored in `tutorial_videos` table with unique `key` identifiers. Admin dashboard has a "Tutorials" tab for uploading/replacing/removing tutorial videos. Videos play inline during onboarding when users choose "View Tutorial". API: `GET/PUT/DELETE /api/tutorial-videos/:key`.
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