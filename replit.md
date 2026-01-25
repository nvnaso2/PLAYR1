# Handlz Basketball Training Platform

## Overview
A "Netflix for basketball drills" platform for Handlz weighted basketballs. Users can browse professional training videos, log their practice sessions, track progress, upload personal training videos, and benchmark against the community by age.

## Tech Stack
- **Frontend**: React + TypeScript with Vite, Wouter routing, TanStack Query
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC)
- **Styling**: Tailwind CSS with shadcn/ui components

## Key Features
1. **Drill Library**: 500+ drills across 7 categories (ball handling, shooting, passing, finishing, defense, basketball IQ, workouts)
2. **Training Log**: Log sessions with duration, reps, sets, and self-rating
3. **Progress Tracking**: Charts and analytics showing improvement over time
4. **Personal Videos**: Upload and manage training videos
5. **Community Benchmarks**: Compare performance against players your age
6. **User Profiles**: Location-based profiles with skill level tracking
7. **Admin Dashboard**: Full CRUD operations for drill management (admin users only)

## Project Structure
```
client/src/
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   ├── app-sidebar.tsx
│   ├── category-card.tsx
│   ├── drill-card.tsx
│   ├── stats-card.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── pages/             # Route pages
│   ├── landing.tsx    # Public landing page
│   ├── dashboard.tsx  # User dashboard
│   ├── drills.tsx     # Drill library
│   ├── drill.tsx      # Single drill view
│   ├── training-log.tsx
│   ├── progress.tsx   # Stats & charts
│   ├── videos.tsx     # User videos
│   ├── profile.tsx    # User profile
│   └── admin.tsx      # Admin dashboard (drill management)
├── hooks/
│   ├── use-auth.ts    # Authentication hook
│   ├── use-admin.ts   # Admin status hook
│   └── use-toast.ts
└── lib/
    ├── queryClient.ts
    └── auth-utils.ts

server/
├── index.ts           # Express server entry
├── routes.ts          # API routes
├── storage.ts         # Database operations
├── seed.ts            # Database seeding
├── db.ts              # Drizzle connection
└── replit_integrations/auth/  # Replit Auth

shared/
├── schema.ts          # Drizzle schema + types
└── models/auth.ts     # Auth-related tables
```

## API Routes
- `GET /api/drills` - List all drills
- `GET /api/drills/featured` - Featured drills
- `GET /api/drills/:id` - Single drill
- `POST /api/drills` - Create drill (admin only)
- `PUT /api/drills/:id` - Update drill (admin only)
- `DELETE /api/drills/:id` - Delete drill (admin only)
- `GET /api/admin/check` - Check if current user is admin
- `GET /api/training-logs` - User's training logs
- `POST /api/training-logs` - Create training log
- `GET /api/profile` - User profile
- `PUT /api/profile` - Update profile
- `GET /api/videos` - User's videos
- `POST /api/videos` - Upload video
- `DELETE /api/videos/:id` - Delete video
- `GET /api/stats/overview` - User stats summary
- `GET /api/stats/weekly` - Weekly stats
- `GET /api/stats/by-category` - Stats by category
- `GET /api/benchmarks` - Community benchmarks

## Database Schema
- `users` - Auth users (Replit Auth)
- `sessions` - Session storage
- `user_profiles` - Extended user data (age, location, skill level, isAdmin flag)
- `drills` - Training drills
- `training_logs` - User training sessions
- `user_videos` - Uploaded training videos
- `drill_progress` - Aggregated drill progress
- `benchmarks` - Community averages by age

## Admin Access
- Admin users are configured via the `ADMIN_USER_IDS` environment variable
- Set `ADMIN_USER_IDS` to a comma-separated list of user IDs (e.g., `12345,67890`)
- Admin navigation appears in sidebar only for admin users
- Non-admin users attempting to access /admin see an access denied message

## Running the App
- Development: `npm run dev`
- Database push: `npm run db:push`

## Design Notes
- Basketball-inspired theme with orange (#f97316) primary color
- Dark mode enabled by default
- Uses Handlz brand assets for hero images and logo
