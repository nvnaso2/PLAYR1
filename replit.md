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
2. **Training Log**: Multi-drill workout flow with table-based tracking and configurable drill metrics
   - Select multiple drills for a workout session
   - Track duration, score, notes per drill
   - Dynamic metric inputs based on admin-configured drill metrics
   - Required metric validation before saving
   - **Shot Location Tracking**: For shooting drills, track per-round:
     - Shot location (16 locations: free-throw, corners, wings, hashes, blocks, mid-range)
     - Shots attempted and shots made
     - Auto-classification: locations are auto-classified as Free Throw, 2-pointer, or 3-pointer
   - **Half-Court Shot Chart**: Visual map showing made/missed shots by location
3. **User-Created Drills**: Users can create and manage their own custom drills
4. **Progress Tracking**: Charts and analytics showing improvement over time
5. **Personal Videos**: Upload and manage training videos
6. **Community Benchmarks**: Compare performance against players your age
7. **User Profiles**: Location-based profiles with skill level tracking
8. **Admin Dashboard**: Full CRUD operations for drill management (admin users only)

## Project Structure
```
client/src/
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   ├── app-sidebar.tsx
│   ├── category-card.tsx
│   ├── drill-card.tsx
│   ├── half-court-map.tsx  # Shot location visualization
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
- `GET /api/drills/:id/metrics` - Get drill metrics configuration
- `POST /api/drills/:id/metrics` - Assign metric templates to drill (admin only)
- `PUT /api/drill-metrics/:id` - Update drill metric (admin only)
- `DELETE /api/drill-metrics/:id` - Delete drill metric (admin only)
- `GET /api/video-library` - List all videos in library (admin only)
- `POST /api/video-library` - Add video to library (admin only)
- `PUT /api/video-library/:id` - Update video (admin only)
- `DELETE /api/video-library/:id` - Delete video (admin only)
- `GET /api/pdf-library` - List all PDFs in library (admin only)
- `GET /api/pdf-library/:id` - Get single PDF (admin only)
- `POST /api/pdf-library` - Add PDF to library (admin only)
- `PUT /api/pdf-library/:id` - Update PDF (admin only)
- `DELETE /api/pdf-library/:id` - Delete PDF (admin only)
- `GET /api/metric-templates` - List all metric templates (admin only)
- `POST /api/metric-templates` - Create metric template (admin only)
- `PUT /api/metric-templates/:id` - Update metric template (admin only)
- `DELETE /api/metric-templates/:id` - Delete metric template (admin only)
- `GET /api/admin/check` - Check if current user is admin
- `GET /api/admin/users` - List all users (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `PUT /api/admin/users/:id/admin` - Toggle user admin status (admin only)
- `GET /api/drills/my-drills` - User's drills with personal bests
- `GET /api/training-logs` - User's training logs
- `POST /api/training-logs` - Create training log
- `GET /api/training-logs/:id/metrics` - Get training log metrics
- `POST /api/training-logs/:id/metrics` - Save training log metrics
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
- `video_library` - Centralized video storage for admin-uploaded training videos
- `pdf_library` - Centralized PDF storage for admin-uploaded training documents
- `metric_templates` - Reusable metric definitions (e.g., Shot Attempts, Shots Made, Shooting %)
- `drill_metrics` - Join table linking drills to metric templates
- `training_logs` - User training sessions
- `training_log_metrics` - Metric values recorded per training log
- `user_videos` - Uploaded training videos
- `drill_progress` - Aggregated drill progress
- `benchmarks` - Community averages by age

## Admin Access
- Admin status is determined by: 1) `ADMIN_USER_IDS` environment variable (bootstrap), or 2) `isAdmin` field in user_profiles table
- Set `ADMIN_USER_IDS` to a comma-separated list of user IDs for initial bootstrap admins
- Admin navigation appears in sidebar only for admin users
- Non-admin users attempting to access /admin see an access denied message

### Admin Dashboard Features
The admin dashboard has five tabs for managing content:

1. **Video Library Tab**: Centralized video management
   - Upload training videos with thumbnails
   - Assign categories and tags to videos
   - Videos are stored in object storage and can be reused across drills

2. **PDF Library Tab**: Centralized PDF document management
   - Upload training PDFs (playbooks, instructions, guides)
   - Assign categories and difficulty levels to PDFs
   - Link PDFs to specific drills with bidirectional synchronization
   - PDFs are stored in object storage (50MB limit)

3. **Metrics Tab**: Reusable metric template configuration
   - Create metric templates (e.g., "Shot Attempts", "Shots Made", "Shooting %")
   - Support for number type (user enters value) and calculated type (auto-computed via formula)
   - Formulas can reference other metrics and formula inputs
   - Templates can be assigned to multiple drills

4. **Drills Tab**: Create and manage training drills
   - Select videos from the centralized Video Library
   - Select PDFs from the centralized PDF Library
   - Configure which metric templates apply to each drill
   - Set featured drills, difficulty levels, categories

5. **Users Tab**: User and permission management
   - View all users
   - Create new users
   - Toggle admin status for any user

## File Uploads (Object Storage)
- Admins can upload video, thumbnail, and PDF files directly using Replit's App Storage
- Upload flow uses presigned URLs for secure direct-to-storage uploads
- Supported video types: MP4, WebM, QuickTime, AVI (max 100MB)
- Supported image types: JPEG, PNG, GIF, WebP (max 10MB)
- Supported document types: PDF (max 50MB)
- Files are served from `/objects/` paths
- API: `POST /api/uploads/request-url` (requires auth + admin)
- API: `GET /objects/{*objectPath}` (serves uploaded files)

## Running the App
- Development: `npm run dev`
- Database push: `npm run db:push`

## Mobile App (Capacitor)
The platform supports native iOS and Android apps via Capacitor:

### Configuration
- **App ID**: com.handlz.training
- **App Name**: Handlz Training
- **Config File**: `capacitor.config.ts`

### Build Process
1. Run `./mobile/setup.sh` to initialize native platforms
2. Use `./mobile/build-ios.sh` for iOS builds (requires Mac with Xcode)
3. Use `./mobile/build-android.sh` for Android builds (requires Android Studio)

### Mobile Features
- Safe area support for iOS notch and Android navigation
- Touch-friendly inputs with 16px minimum font size
- Responsive layouts with stacking tabs on small screens
- Native splash screens and app icons

See `mobile/MOBILE_BUILD_GUIDE.md` for detailed deployment instructions.

## Design Notes
- Basketball-inspired theme with orange (#f97316) primary color
- Dark mode enabled by default
- Uses Handlz brand assets for hero images and logo
