# PLAYR1 Basketball Training Platform

## Overview
PLAYR1 is a comprehensive basketball training platform aiming to be the "Netflix for basketball drills." It provides users with professional training videos, enables logging of practice sessions, tracks progress, supports uploading personal training videos, and facilitates performance benchmarking within a community. The platform's vision is to enhance skill development and community engagement through a rich library of drills, detailed progress tracking, user-generated content, and social features.

## User Preferences
- I prefer clear and concise explanations.
- I like an iterative development process, where I can provide feedback frequently.
- Please ask for my approval before implementing major changes or architectural decisions.
- Focus on delivering functional features quickly.
- Ensure the user interface is intuitive and user-friendly.

## System Architecture
The platform utilizes a modern web stack: React with TypeScript for the frontend, an Express.js backend, and a PostgreSQL database managed with Drizzle ORM. Authentication is handled via custom email/password, bcrypt for hashing, and stateless JWT tokens. The UI/UX incorporates Tailwind CSS and shadcn/ui components, featuring an orange primary color scheme, dark mode by default, and mobile accessibility via Capacitor for native iOS and Android apps.

**Core Architectural Features:**

*   **Training System**: Includes a dynamic drill library, detailed training logs with shot tracking, progress analytics, and a "Trophy Room." A Daily Streak Challenge, powered by OpenAI GPT, generates unique daily drills for all users globally.
*   **User & Community Engagement**: Supports user-generated drills, video uploads, customizable public profiles, performance comparison, social sharing, and a public feedback forum.
*   **Role-Based Access**: Distinguishes between player and trainer interfaces, including a "Coach / Trainer Mode" for player management, drill assignments, evaluations, and communication.
*   **Communication & Collaboration**: Offers group chat, a universal connection system, and push notifications.
*   **Trainer & Session Management**: Trainers can create public profiles and manage training sessions through a booking flow with Google Calendar integration.
*   **Player Development Tools**: Trainers can conduct player evaluations, and players can import game stats via CSV.
*   **Administrative & Analytics**: An Admin Dashboard provides management for drills, users, and resources, alongside an Analytics Dashboard with insights on overview, retention, funnels, user segmentation, content performance, and live activity. AI Insights provide anomaly detection and executive summaries.
*   **Account Management**: Features an onboarding wizard, email notifications, and optional parent/guardian visibility for minors.
*   **Monetization**: Integrates Stripe for subscription and one-time session payments.
*   **Program Assignment**: Trainers can assign structured training programs to their connected players, offering different visibility tiers for programs.
*   **Events / Challenges**: Time-windowed wraps around programs with leaderboards, accessed via a dedicated events section.
*   **Structured Training Programs**: Multi-day programs comprising various item types (drill, workout, challenge, watch, rest), allowing user-paced progression and concurrent enrollments.

## External Dependencies
*   **Custom Auth**: `bcryptjs`, `jsonwebtoken`
*   **Cookie Handling**: `cookie-parser`
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Frontend Build**: Vite
*   **Routing**: Wouter
*   **Data Fetching**: TanStack Query
*   **Styling**: Tailwind CSS, shadcn/ui
*   **Image Generation**: html2canvas
*   **Mobile Development**: Capacitor
*   **File Storage**: Replit App Storage
*   **Calendar Integration**: googleapis (for Google Calendar)
*   **Email Notifications**: @sendgrid/mail
*   **Geocoding**: zipcode
*   **Push Notifications**: web-push
*   **Payment Gateway**: stripe
*   **Stripe Data Sync**: stripe-replit-sync
*   **AI Integration**: OpenAI (via Replit AI Integrations)
*   **GeoIP Lookup**: geoip-lite
*   **Map Rendering**: react-simple-maps