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
The platform is built with a modern web stack: React + TypeScript for the frontend, an Express.js backend, and a PostgreSQL database with Drizzle ORM. Authentication is handled via Replit Auth. Styling uses Tailwind CSS and shadcn/ui components, featuring an orange primary color and dark mode by default. The design ensures mobile accessibility via Capacitor for native iOS and Android apps.

**Key Features:**

*   **Drill Library & Training Log**: Extensive drill library with dynamic metric inputs, detailed shot location tracking, and visual half-court shot charts.
*   **Progress Tracking & Achievements**: Visualizes improvement with charts, analytics, shooting heatmaps, and a "Trophy Room" for tracking achievements, challenges, and personal records.
*   **User-Generated Content**: Users can create custom drills and upload personal training videos.
*   **Community & Social Features**: Enables performance comparison, customizable public player profiles, and shareable social media cards.
*   **Admin Dashboard**: Comprehensive management of drills, videos, resources, metric templates, and user accounts.
*   **Coach / Trainer Mode**: Role-based interface with dedicated routes for trainers to manage rosters, drills, workouts, training logs, videos, chat, player progress, and evaluations.
*   **Group Chat**: Supports team-based, position-based, and custom group conversations.
*   **Onboarding Wizard**: Multi-step, role-based onboarding process for players and trainers, including profile creation and interest/specialty selection.
*   **Tutorial Videos**: Admin-managed video tutorials integrated into the onboarding flow.
*   **Teams & Leagues**: Consolidated page for finding teams/leagues and managing player's own team memberships.
*   **My Trainer**: Consolidated player page for finding trainers, managing sessions, viewing evaluations, and direct messaging with trainers.
*   **Trainer Profile Builder**: Trainers can create detailed public profiles including availability, specialties, rates, and training locations.
*   **Session Scheduling**: Full booking flow for training sessions between players and trainers, including requesting, confirming, rescheduling, and cancelling sessions.
*   **Player Evaluations**: Trainers can rate player skill attributes using configurable scales (numeric and word ratings), with support for custom attributes and progress tracking.
*   **Payments (Stripe)**: Placeholder for future Stripe Connect integration.

## External Dependencies
*   **Replit Auth**: User authentication.
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