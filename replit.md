# PLAYR1 Basketball Training Platform

## Overview
PLAYR1 is a "Netflix for basketball drills" platform designed to offer a complete basketball training experience. It provides users with access to professional training videos, enables logging of practice sessions, tracks progress, supports uploading personal training videos, and allows performance benchmarking within a community. The platform's core vision is to foster skill development and community engagement through a rich library of drills, comprehensive progress tracking, user-generated content features, and social functionalities.

## User Preferences
- I prefer clear and concise explanations.
- I like an iterative development process, where I can provide feedback frequently.
- Please ask for my approval before implementing major changes or architectural decisions.
- Focus on delivering functional features quickly.
- Ensure the user interface is intuitive and user-friendly.

## System Architecture
The platform is built using a modern web stack: React with TypeScript for the frontend, an Express.js backend, and a PostgreSQL database managed with Drizzle ORM. Authentication is handled via custom email/password, bcrypt for password hashing, and stateless JWT tokens stored as httpOnly cookies. The UI/UX features Tailwind CSS and shadcn/ui components, adopting an orange primary color scheme and dark mode by default, with mobile accessibility ensured by Capacitor for native iOS and Android apps.

**Key Features:**

*   **Core Training System**: Includes a dynamic drill library, detailed training log with shot location tracking and visual half-court charts, and progress tracking with analytics, shooting heatmaps, and a "Trophy Room" for achievements.
*   **User & Community Engagement**: Supports user-generated drills and video uploads, customizable public player profiles, performance comparison, social media sharing, and a public feedback forum for suggestions and bugs.
*   **Role-Based Access**: Features distinct interfaces for players and trainers, including a "Coach / Trainer Mode" for player management, drill assignments, evaluations, and communication.
*   **Communication & Collaboration**: Offers group chat functionalities, a universal connection system with invite capabilities, and integrates push notifications for key events.
*   **Trainer & Session Management**: Trainers can build detailed public profiles, and a full booking flow for training sessions supports scheduling, rescheduling, and group sessions. Google Calendar integration is available for session synchronization.
*   **Player Development Tools**: Trainers can conduct player evaluations with configurable skill attribute ratings. Players can also bulk-import game stats via CSV.
*   **Administrative & Utility**: An Admin Dashboard provides comprehensive management for drills, users, resources, and includes an Analytics Dashboard for platform insights. Admins can also manage picklist options like Shot Locations and Shot Types.
*   **Account Management**: Features an onboarding wizard for new users, email notifications for critical events, and an optional parent/guardian visibility feature for minor players.
*   **Monetization**: Integrated Stripe for payment processing, supporting subscriptions and one-time session payments.

## External Dependencies
*   **Custom Auth**: Uses `bcryptjs` and `jsonwebtoken` for secure user authentication.
*   **cookie-parser**: For handling JWT cookies.
*   **PostgreSQL**: Primary database.
*   **Drizzle ORM**: For database interactions.
*   **Vite**: Frontend build tool.
*   **Wouter**: Client-side routing.
*   **TanStack Query**: Data fetching and caching.
*   **Tailwind CSS & shadcn/ui**: For styling and UI components.
*   **html2canvas**: Used for generating shareable images.
*   **Capacitor**: For mobile application development.
*   **Replit App Storage**: For media file storage.
*   **googleapis**: Integration with Google Calendar.
*   **@sendgrid/mail**: For email notifications.
*   **zipcodes**: Geocoding utility for location-based features.
*   **web-push**: For browser push notifications.
*   **stripe**: Payment gateway integration.
*   **stripe-replit-sync**: Automates Stripe data synchronization with the database.