# Seattle Third Spaces — Master Reference Document

> **Purpose:** Single source of truth for the Seattle Third Spaces web application. Designed for AI agents and developers working in isolated sessions. Read this document in full before writing any code or making any change to the project.
>
> **Status:** Pre-implementation (Foundation Plan)
> **Last Updated:** 2026-02-12

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Decisions Record (ADR)](#2-architecture-decisions-record-adr)
3. [Tech Stack](#3-tech-stack)
4. [Repository Structure](#4-repository-structure)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [Row-Level Security (RLS) Policies](#7-row-level-security-rls-policies)
8. [Storage Configuration](#8-storage-configuration)
9. [Authentication & Authorization Model](#9-authentication--authorization-model)
10. [Email Notification System](#10-email-notification-system)
11. [Route Architecture](#11-route-architecture)
12. [Server Actions Reference](#12-server-actions-reference)
13. [Component Architecture](#13-component-architecture)
14. [Security Posture](#14-security-posture)
15. [Deployment & CI/CD](#15-deployment--cicd)
16. [Agent Execution Plan](#16-agent-execution-plan)
17. [File Relationship Map](#17-file-relationship-map)
18. [Open Decisions](#18-open-decisions)
19. [Maintenance Guide](#19-maintenance-guide)

---

## 1. Project Overview

**Application Name:** Seattle Third Spaces
**Region:** Seattle Metropolitan Area
**Purpose:** A centralized, searchable web platform for discovering community "third spaces" (cafés, bars, parks, community centers, etc.) and their associated events.

**Primary Problem Solved:** Information about third spaces and community events is fragmented across social media, flyers, and informal word-of-mouth networks, making discovery difficult and reducing community participation.

### 1.1 Content Types

| Type | Description |
|---|---|
| **Place** | A physical location open to the public (café, bar, park, etc.) |
| **Event** | A time-bound happening anchored to a Place. Cannot exist without a Place. |

### 1.2 User Roles

| Role | DB Value | Description | How Granted |
|---|---|---|---|
| Visitor | *(no account)* | Browse and discover public content | No account required |
| Member | `member` | Authenticated; can write reviews and submit reports | Default on sign-up |
| Organizer | `organizer` | Creates and manages Places + Events; can submit for moderation | Admin approval of a role request |
| Admin | `admin` | Full control: publish/hide/reject content, manage tags, triage reports, approve organizer requests | Assigned directly in DB by project owner only |

> **INVARIANT:** There is no self-serve path to `admin`. Admin role is ONLY set directly in the database by the project owner. There is NO API or UI to grant this role.

### 1.3 Core Workflow Summary

```
Visitor browses → signs up as Member → requests Organizer role
  → Admin approves request (email notification sent)
  → Organizer creates Place/Event (status: draft)
  → Organizer submits for review (status: pending, moderation_queue entry created)
  → Admin approves/rejects (email notification sent to Organizer)
  → If approved: status → published (visible to all visitors)
```

### 1.4 MVP Feature Set

- Browse/search/filter places and events (PostgreSQL FTS)
- List-first homepage with two tabs: Events (upcoming) + Places (recently added)
- Explore page with interactive Mapbox map + marker clustering + filter panel
- Place detail page: info + related upcoming events + reviews + small map snippet
- Event detail page: info + primary image + associated place + reviews
- Organizer submission + admin moderation workflow with email notifications
- Reviews (1–5 star rating + text body) for both Places and Events
- Primary image upload per event (Supabase Storage, auto-resized to WebP)
- Admin dashboard: moderation queue, reports triage, tag management, organizer requests
- Transactional email: submission approved/rejected, organizer role request/decision

---

## 2. Architecture Decisions Record (ADR)

These decisions are **LOCKED**. AI agents MUST follow them without deviation unless the project owner explicitly revises this document.

| # | Decision | Choice | Rationale |
|---|---|---|---|
| ADR-01 | Frontend framework | Next.js 14+ (App Router) | SSR/SSG, Server Actions, file-based routing, Edge Runtime support |
| ADR-02 | UI library | Tailwind CSS + shadcn/ui | No runtime overhead, accessible primitives, copy-paste ownership model |
| ADR-03 | Backend | Supabase (PostgreSQL + Auth + Storage) | Integrated auth, RLS, real-time capable, storage — single vendor for MVP |
| ADR-04 | Hosting | Vercel | Native Next.js integration, Edge middleware, preview deployments |
| ADR-05 | Maps | Mapbox GL JS via react-map-gl | Selected by project owner |
| ADR-06 | Email | Resend + React Email | Best TypeScript support, generous free tier, works well with Server Actions |
| ADR-07 | Error tracking | Sentry | Industry standard, strong Next.js integration |
| ADR-08 | Auth providers | Email+Password, Google OAuth, Magic Link | Confirmed by project owner |
| ADR-09 | Organizer role path | Request + Admin approval | Prevents spam/abuse; admin has oversight |
| ADR-10 | Admin/Moderator | Single `admin` role | Simplified for MVP; no separate moderator role |
| ADR-11 | Event place_id | NOT NULL | All events must link to a Place; keeps map/list data consistent |
| ADR-12 | Homepage feed | Separate tabs (Events upcoming / Places recent) | Confirmed by project owner |
| ADR-13 | Email notifications | Yes, at MVP | Workflow events: submission status + organizer role decisions |
| ADR-14 | Language | TypeScript, strict mode | Type safety, better DX, industry standard |
| ADR-15 | Form validation | Zod + react-hook-form | Same schema on client and server; type-safe |
| ADR-16 | Search | PostgreSQL FTS (pg_trgm + tsvector) for MVP | Upgrade path to Typesense/Meilisearch defined; no extra service for MVP |
| ADR-17 | State management | React Server Components + minimal client state | App Router paradigm; no Redux/Zustand for MVP |
| ADR-18 | Image processing | sharp (server-side resize/compress to WebP) | Security (strips EXIF), performance, consistent output |
| ADR-19 | Image upload | Via `/api/upload/event-image` route handler | Validates + processes before reaching Storage; never direct browser → Storage |

---

## 3. Tech Stack

### 3.1 Production Dependencies

```json
{
  "next": "^14.x",
  "react": "^18.x",
  "react-dom": "^18.x",
  "typescript": "^5.x",
  "@supabase/ssr": "^0.x",
  "@supabase/supabase-js": "^2.x",
  "mapbox-gl": "^3.x",
  "react-map-gl": "^7.x",
  "resend": "^3.x",
  "@react-email/components": "^0.x",
  "zod": "^3.x",
  "react-hook-form": "^7.x",
  "@hookform/resolvers": "^3.x",
  "sharp": "^0.33.x",
  "file-type": "^19.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x",
  "date-fns": "^3.x",
  "lucide-react": "^0.x"
}
```

### 3.2 Development Dependencies

```json
{
  "tailwindcss": "^3.x",
  "postcss": "^8.x",
  "autoprefixer": "^10.x",
  "@types/node": "^20.x",
  "@types/react": "^18.x",
  "@types/react-dom": "^18.x",
  "@types/mapbox-gl": "^2.x",
  "eslint": "^8.x",
  "eslint-config-next": "^14.x",
  "prettier": "^3.x",
  "prettier-plugin-tailwindcss": "^0.x",
  "@sentry/nextjs": "^8.x"
}
```

### 3.3 External Services

| Service | Purpose | Environment Variable |
|---|---|---|
| Supabase | Database (PostgreSQL), Auth, Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Mapbox | Interactive maps, marker clustering | `NEXT_PUBLIC_MAPBOX_TOKEN` |
| Resend | Transactional email delivery | `RESEND_API_KEY` |
| Sentry | Error tracking + performance monitoring | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| Vercel | Hosting, Edge middleware, preview deployments | Configured via dashboard |
| GitHub | Version control, CI trigger | Vercel GitHub integration |

---

## 4. Repository Structure

```
project-root/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                         # Typecheck + lint + build + audit on every PR
│   │   └── sentry-release.yml             # Sentry release on push to main
│   └── dependabot.yml                     # Automated security patch PRs
│
├── public/
│   ├── favicon.ico
│   └── og-image.png                       # Default Open Graph image
│
├── src/
│   │
│   ├── app/                               # Next.js App Router — all routes live here
│   │   │
│   │   ├── (public)/                      # Route group — uses public layout (Header + Footer)
│   │   │   ├── layout.tsx                 # Public layout: renders Header, Footer, PageContainer
│   │   │   ├── page.tsx                   # Homepage: tabbed feed (Events upcoming | Places recent)
│   │   │   ├── explore/
│   │   │   │   └── page.tsx               # Interactive Mapbox map + FilterPanel sidebar
│   │   │   ├── places/
│   │   │   │   ├── page.tsx               # Browse all published places with filters
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx           # Place detail + related events + reviews + map snippet
│   │   │   └── events/
│   │   │       ├── page.tsx               # Browse upcoming published events with filters
│   │   │       └── [id]/
│   │   │           └── page.tsx           # Event detail + primary image + place link + reviews
│   │   │
│   │   ├── auth/                          # Auth routes — no route group wrapper (different layout)
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx               # Sign-in page (email+password, Google, magic link)
│   │   │   ├── sign-up/
│   │   │   │   └── page.tsx               # Sign-up page (creates member account)
│   │   │   ├── callback/
│   │   │   │   └── route.ts               # GET — handles OAuth code exchange + magic link
│   │   │   └── confirm/
│   │   │       └── route.ts               # GET — email confirmation redirect handler
│   │   │
│   │   ├── organizer/                     # Protected: requires role = organizer OR admin
│   │   │   ├── layout.tsx                 # Role guard: redirects to /auth/sign-in if unauthorized
│   │   │   ├── page.tsx                   # Dashboard: my places/events summary + pending queue
│   │   │   ├── places/
│   │   │   │   ├── page.tsx               # My places list (all statuses)
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx           # Create place form
│   │   │   │   └── [id]/
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx       # Edit place form (only draft/pending)
│   │   │   └── events/
│   │   │       ├── page.tsx               # My events list (all statuses)
│   │   │       ├── new/
│   │   │       │   └── page.tsx           # Create event form (requires place selection)
│   │   │       └── [id]/
│   │   │           └── edit/
│   │   │               └── page.tsx       # Edit event form (only draft/pending)
│   │   │
│   │   ├── admin/                         # Protected: requires role = admin ONLY
│   │   │   ├── layout.tsx                 # Admin guard: redirects if not admin
│   │   │   ├── page.tsx                   # Admin overview: counts, recent activity
│   │   │   ├── moderation/
│   │   │   │   └── page.tsx               # Pending moderation queue (approve/reject with note)
│   │   │   ├── reports/
│   │   │   │   └── page.tsx               # Open reports triage
│   │   │   ├── tags/
│   │   │   │   └── page.tsx               # Create/delete tags (theme | category)
│   │   │   └── organizer-requests/
│   │   │       └── page.tsx               # Pending organizer role requests (approve/reject)
│   │   │
│   │   ├── api/
│   │   │   └── upload/
│   │   │       └── event-image/
│   │   │           └── route.ts           # POST — validate + process + store event image
│   │   │
│   │   ├── layout.tsx                     # Root layout: fonts, global providers, Sentry
│   │   ├── not-found.tsx                  # Global 404 page
│   │   └── error.tsx                      # Global error boundary
│   │
│   ├── components/
│   │   │
│   │   ├── ui/                            # shadcn/ui generated components
│   │   │                                  # !! DO NOT EDIT MANUALLY — use `npx shadcn@latest add`
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── form.tsx
│   │   │   ├── table.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── alert.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.tsx                 # Nav bar: logo, links, auth state, role-aware items
│   │   │   ├── Footer.tsx                 # Site footer
│   │   │   └── PageContainer.tsx          # Max-width centered content wrapper
│   │   │
│   │   ├── places/
│   │   │   ├── PlaceCard.tsx              # Card for list/grid view; shows name, neighborhood, tags, avg rating
│   │   │   ├── PlaceList.tsx              # Renders a grid/list of PlaceCards
│   │   │   ├── PlaceForm.tsx              # Create/edit form (shared); prop: initialData?, onSuccess
│   │   │   └── PlaceMapSnippet.tsx        # Small Mapbox static map on place detail page
│   │   │
│   │   ├── events/
│   │   │   ├── EventCard.tsx              # Card showing title, date, place name, image thumbnail, tags
│   │   │   ├── EventList.tsx              # Renders a list/grid of EventCards
│   │   │   ├── EventForm.tsx              # Create/edit form (shared); includes place selector
│   │   │   └── EventImageUpload.tsx       # Uploads to /api/upload/event-image; returns storage path
│   │   │
│   │   ├── map/
│   │   │   ├── ExploreMap.tsx             # 'use client' — Mapbox GL with clustering; must be dynamically imported (ssr:false)
│   │   │   ├── MapPin.tsx                 # Custom SVG marker component
│   │   │   └── MapFilterPanel.tsx         # Filter sidebar for explore page (tags, indoor/outdoor, is_free)
│   │   │
│   │   ├── reviews/
│   │   │   ├── ReviewCard.tsx             # Displays one review: author, rating stars, body, date
│   │   │   ├── ReviewList.tsx             # Renders list of ReviewCards with average rating header
│   │   │   └── ReviewForm.tsx             # 1-5 star selector + text body; auth required; hides if visitor
│   │   │
│   │   ├── moderation/
│   │   │   ├── ModerationQueueTable.tsx   # Admin: table of pending submissions with actions
│   │   │   ├── ModerationActions.tsx      # Approve button + Reject button (reject requires note text)
│   │   │   └── ReportsTable.tsx           # Admin: table of open reports with triage/close actions
│   │   │
│   │   ├── search/
│   │   │   ├── SearchBar.tsx              # Debounced text input; updates URL search params
│   │   │   └── FilterPanel.tsx            # Tag chips + indoor/outdoor/free toggles + neighborhood select
│   │   │
│   │   └── auth/
│   │       ├── SignInForm.tsx             # Email+password form + Google OAuth button + magic link option
│   │       ├── SignUpForm.tsx             # Display name + email + password form
│   │       └── OrganizerRequestForm.tsx   # Optional message textarea + submit request button
│   │
│   ├── lib/
│   │   │
│   │   ├── supabase/
│   │   │   ├── client.ts                  # createBrowserClient() — import ONLY in 'use client' components
│   │   │   ├── server.ts                  # createServerClient() — import in Server Components, Actions, Route Handlers
│   │   │   ├── admin.ts                   # createClient(service_role_key) — ONLY for Server Actions needing bypassed RLS
│   │   │   │                              # !! NEVER import in components/ or (public)/ routes
│   │   │   └── database.types.ts          # Auto-generated by `supabase gen types` — DO NOT edit manually
│   │   │
│   │   ├── mapbox.ts                      # Exports NEXT_PUBLIC_MAPBOX_TOKEN; Mapbox config constants (default center/zoom)
│   │   │
│   │   ├── email/
│   │   │   ├── client.ts                  # Resend client singleton: new Resend(process.env.RESEND_API_KEY)
│   │   │   └── templates/
│   │   │       ├── SubmissionApproved.tsx      # React Email: place/event approved notification → Organizer
│   │   │       ├── SubmissionRejected.tsx      # React Email: place/event rejected + note → Organizer
│   │   │       ├── OrganizerRequestReceived.tsx # React Email: new role request alert → Admin
│   │   │       └── OrganizerRequestDecision.tsx # React Email: role request approved/rejected → User
│   │   │
│   │   ├── validations/
│   │   │   ├── place.ts                   # Zod: PlaceSchema — used in PlaceForm + createPlace/updatePlace actions
│   │   │   ├── event.ts                   # Zod: EventSchema — used in EventForm + createEvent/updateEvent actions
│   │   │   ├── review.ts                  # Zod: ReviewSchema — used in ReviewForm + createReview action
│   │   │   └── auth.ts                    # Zod: SignUpSchema, SignInSchema — used in auth forms + actions
│   │   │
│   │   └── utils.ts                       # cn() (clsx + twMerge), formatDate(), formatRelativeTime(), truncate()
│   │
│   ├── actions/                           # Next.js Server Actions ('use server' at file top)
│   │   ├── places.ts                      # createPlace, updatePlace, submitPlaceForReview, publishPlace, hidePlace, rejectPlace
│   │   ├── events.ts                      # createEvent, updateEvent, submitEventForReview, publishEvent, hideEvent, rejectEvent
│   │   ├── reviews.ts                     # createReview, hideReview
│   │   ├── moderation.ts                  # approveSubmission, rejectSubmission, triageReport, closeReport
│   │   ├── tags.ts                        # createTag, deleteTag
│   │   ├── organizer-requests.ts          # requestOrganizerRole, approveOrganizerRequest, rejectOrganizerRequest
│   │   └── auth.ts                        # signUp, signIn, signOut, signInWithGoogle, requestMagicLink, updateProfile
│   │
│   ├── hooks/
│   │   ├── useUser.ts                     # Returns { user, profile, role, isLoading } from Supabase session
│   │   ├── useDebounce.ts                 # Generic debounce hook — used in SearchBar
│   │   └── useMap.ts                      # Mapbox map instance ref + viewport state
│   │
│   └── types/
│       └── index.ts                       # App-level type aliases and interfaces (not DB types — those are in database.types.ts)
│
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql       # Enums, tables, constraints, indexes
│   │   ├── 00002_functions.sql            # get_my_role(), handle_new_user() trigger, update_updated_at() trigger
│   │   ├── 00003_rls_policies.sql         # All RLS policies for all tables
│   │   ├── 00004_storage.sql              # event-images bucket + storage RLS policies
│   │   └── 00005_seed_tags.sql            # Initial taxonomy tags (TBD — see Open Decisions)
│   ├── seed.sql                           # Dev-only seed data (never run in production)
│   └── config.toml                        # Supabase local dev configuration
│
├── middleware.ts                          # Next.js middleware: session refresh + route protection
├── next.config.ts                         # Security headers, image domains, env validation, Sentry config
├── tailwind.config.ts                     # Tailwind config: content paths, theme extensions
├── components.json                        # shadcn/ui project config
├── tsconfig.json                          # TypeScript config (strict: true)
├── .env.local.example                     # Env template — committed with placeholder values (no real secrets)
├── .eslintrc.json                         # ESLint config extending next/core-web-vitals
├── .prettierrc                            # Prettier config with tailwindcss plugin
├── sentry.client.config.ts               # Sentry browser init
├── sentry.server.config.ts               # Sentry server init
└── sentry.edge.config.ts                 # Sentry Edge runtime init
```

---

## 5. Environment Variables

> Variables prefixed `NEXT_PUBLIC_` are exposed to the browser bundle. All others are server-only.
> Never commit real values. Only `.env.local.example` with placeholder values is committed.

```env
# ── Supabase ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=                    # Project URL (safe to expose)
NEXT_PUBLIC_SUPABASE_ANON_KEY=               # Anon key (safe; RLS restricts what it can access)
SUPABASE_SERVICE_ROLE_KEY=                   # SERVER ONLY — bypasses RLS. Import ONLY in lib/supabase/admin.ts

# ── Mapbox ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_MAPBOX_TOKEN=                    # Must be domain-restricted in Mapbox dashboard

# ── Resend (Email) ────────────────────────────────────────────────────────────
RESEND_API_KEY=                              # SERVER ONLY — transactional email
RESEND_FROM_EMAIL=noreply@yourdomain.com     # Must be a verified sender domain in Resend dashboard

# ── Admin Notifications ───────────────────────────────────────────────────────
ADMIN_NOTIFICATION_EMAIL=                    # SERVER ONLY — receives organizer request alerts

# ── Sentry ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=                      # Client-side error reporting
SENTRY_AUTH_TOKEN=                           # SERVER/CI ONLY — source map upload
SENTRY_ORG=                                  # Sentry organization slug
SENTRY_PROJECT=                              # Sentry project slug

# ── Application ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://yourdomain.com   # Used for OAuth redirect URLs, email links, OG tags
NODE_ENV=development                         # Set to 'production' by Vercel automatically
```

**Security rules for environment variables:**
- `SUPABASE_SERVICE_ROLE_KEY` must appear in code **only** in `src/lib/supabase/admin.ts`
- `RESEND_API_KEY` must be used **only** in Server Actions or Route Handlers
- `ADMIN_NOTIFICATION_EMAIL` must never appear in client-side code
- The Mapbox token must be domain-restricted at [mapbox.com/account/access-tokens](https://account.mapbox.com/access-tokens/) to prevent abuse

---

## 6. Database Schema

> Migrations are numbered and applied in order. **Never edit a deployed migration.** Create a new migration for any change.

### 6.1 Enums

```sql
CREATE TYPE app_role AS ENUM ('member', 'organizer', 'admin');

CREATE TYPE content_status AS ENUM ('draft', 'pending', 'published', 'hidden', 'rejected');

CREATE TYPE report_reason AS ENUM ('spam', 'duplicate', 'incorrect_info', 'inappropriate', 'other');
```

### 6.2 Tables

#### `profiles`
Extended user record, auto-created by trigger when a new `auth.users` row is inserted.

```sql
CREATE TABLE profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  role         app_role    NOT NULL DEFAULT 'member',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

> **INVARIANT:** Profile `role` field is read-only from the client. Only Server Actions using the admin client (service role) may update it — specifically when approving an organizer request.

---

#### `organizer_requests`
Tracks requests from members to be promoted to the organizer role.

```sql
CREATE TABLE organizer_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message     text,                          -- Optional message explaining intent
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid        REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Prevent a user from having multiple pending requests simultaneously
CREATE UNIQUE INDEX organizer_requests_one_pending_per_user
  ON organizer_requests(user_id)
  WHERE status = 'pending';
```

---

#### `places`

```sql
CREATE TABLE places (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text             NOT NULL,
  description    text,
  address        text             NOT NULL,
  neighborhood   text,
  zip            text,
  lat            double precision NOT NULL,    -- Required; used for map display
  lng            double precision NOT NULL,    -- Required; used for map display
  indoors        boolean          NOT NULL DEFAULT false,
  outdoors       boolean          NOT NULL DEFAULT false,
  is_free        boolean,                      -- NULL means unknown
  accessibility  jsonb            NOT NULL DEFAULT '{}',
  status         content_status   NOT NULL DEFAULT 'draft',
  created_by     uuid             NOT NULL REFERENCES profiles(id),
  created_at     timestamptz      NOT NULL DEFAULT now(),
  updated_at     timestamptz      NOT NULL DEFAULT now(),
  dedupe_key     text             UNIQUE       -- Set by application: lower(name)||'|'||lower(address)
);
```

> **INVARIANT:** `lat` and `lng` are NOT NULL. The Explore map depends on all places having coordinates.
> **INVARIANT:** At least one of `indoors` or `outdoors` must be `true`. Enforce this in the Zod schema.
> **NOTE:** `dedupe_key` is optional but recommended for preventing duplicate submissions. Set it in the Server Action before insert.

---

#### `events`

```sql
CREATE TABLE events (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id            uuid           NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
  title               text           NOT NULL,
  description         text,
  starts_at           timestamptz    NOT NULL,
  ends_at             timestamptz,
  is_free             boolean,                   -- NULL means unknown
  indoors             boolean        NOT NULL DEFAULT false,
  outdoors            boolean        NOT NULL DEFAULT false,
  primary_image_path  text,                      -- Storage path: event-images/{event_id}/{uuid}.webp
  status              content_status NOT NULL DEFAULT 'draft',
  created_by          uuid           NOT NULL REFERENCES profiles(id),
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now(),
  dedupe_key          text           UNIQUE,      -- Set by application: lower(title)||'|'||starts_at::text||'|'||place_id
  CONSTRAINT ends_after_starts CHECK (ends_at IS NULL OR ends_at > starts_at)
);
```

> **INVARIANT:** `place_id` is NOT NULL. Every event must be tied to a Place record. (ADR-11)
> **INVARIANT:** Events require `primary_image_path` before being submitted for moderation. Enforce in the Zod EventSchema and `submitEventForReview` Server Action.
> **NOTE:** `ON DELETE RESTRICT` on `place_id` means you cannot delete a Place that has events. Organizer must delete/archive events first.

---

#### `tags`

```sql
CREATE TABLE tags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  kind       text        NOT NULL CHECK (kind IN ('theme', 'category')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

#### `place_tags`

```sql
CREATE TABLE place_tags (
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (place_id, tag_id)
);
```

---

#### `event_tags`

```sql
CREATE TABLE event_tags (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);
```

---

#### `reviews`
Polymorphic: each review targets either a Place OR an Event, never both.

```sql
CREATE TABLE reviews (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text           NOT NULL CHECK (target_type IN ('place', 'event')),
  place_id    uuid           REFERENCES places(id) ON DELETE CASCADE,
  event_id    uuid           REFERENCES events(id) ON DELETE CASCADE,
  user_id     uuid           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      int            NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        text,
  status      content_status NOT NULL DEFAULT 'published',
  created_at  timestamptz    NOT NULL DEFAULT now(),

  -- Exactly one target must be set
  CONSTRAINT review_single_target CHECK (
    (target_type = 'place' AND place_id IS NOT NULL AND event_id IS NULL) OR
    (target_type = 'event' AND event_id IS NOT NULL AND place_id IS NULL)
  )
);

-- One review per user per place (partial unique index ignores NULLs correctly)
CREATE UNIQUE INDEX reviews_one_per_user_place
  ON reviews(user_id, place_id)
  WHERE place_id IS NOT NULL;

CREATE UNIQUE INDEX reviews_one_per_user_event
  ON reviews(user_id, event_id)
  WHERE event_id IS NOT NULL;
```

---

#### `reports`
Moderation tickets submitted by any authenticated user.

```sql
CREATE TABLE reports (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text          NOT NULL CHECK (target_type IN ('place', 'event', 'review')),
  place_id    uuid          REFERENCES places(id)  ON DELETE CASCADE,
  event_id    uuid          REFERENCES events(id)  ON DELETE CASCADE,
  review_id   uuid          REFERENCES reviews(id) ON DELETE CASCADE,
  reason      report_reason NOT NULL,
  details     text,
  status      text          NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'triaged', 'closed')),
  created_at  timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT report_single_target CHECK (
    (target_type = 'place'  AND place_id  IS NOT NULL AND event_id IS NULL     AND review_id IS NULL) OR
    (target_type = 'event'  AND event_id  IS NOT NULL AND place_id IS NULL     AND review_id IS NULL) OR
    (target_type = 'review' AND review_id IS NOT NULL AND place_id IS NULL     AND event_id IS NULL)
  )
);
```

---

#### `moderation_queue`
Tracks submission/edit requests awaiting admin review.

```sql
CREATE TABLE moderation_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type    text        NOT NULL CHECK (item_type IN ('place', 'event')),
  item_id      uuid        NOT NULL,
  submitted_by uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action       text        NOT NULL CHECK (action IN ('create', 'edit')),
  note         text,                            -- Optional message from organizer
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  uuid        REFERENCES profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

---

### 6.3 Database Functions

```sql
-- Returns the app_role of the currently authenticated user.
-- SECURITY DEFINER: runs with definer privileges to access profiles.
-- STABLE: result is consistent within a transaction (used in RLS for performance).
CREATE OR REPLACE FUNCTION get_my_role()
  RETURNS app_role
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Auto-creates a profile row when a new auth.users record is inserted.
-- Triggered by on_auth_user_created.
CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-updates updated_at on any UPDATE.
CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 6.4 Indexes

```sql
-- Places
CREATE INDEX places_status_idx       ON places(status);
CREATE INDEX places_neighborhood_idx ON places(neighborhood);
CREATE INDEX places_zip_idx          ON places(zip);
CREATE INDEX places_location_idx     ON places(lat, lng);
CREATE INDEX places_created_by_idx   ON places(created_by);
CREATE INDEX places_created_at_idx   ON places(created_at DESC);
-- Full-text search
CREATE INDEX places_fts_idx ON places
  USING gin(to_tsvector('english',
    name || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(address, '') || ' ' ||
    COALESCE(neighborhood, '')
  ));

-- Events
CREATE INDEX events_status_idx     ON events(status);
CREATE INDEX events_starts_at_idx  ON events(starts_at ASC);
CREATE INDEX events_place_id_idx   ON events(place_id);
CREATE INDEX events_created_by_idx ON events(created_by);
-- Full-text search
CREATE INDEX events_fts_idx ON events
  USING gin(to_tsvector('english',
    title || ' ' || COALESCE(description, '')
  ));

-- Tags
CREATE INDEX tags_name_idx ON tags(name);
CREATE INDEX tags_kind_idx ON tags(kind);

-- Reviews
CREATE INDEX reviews_place_id_idx ON reviews(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX reviews_event_id_idx ON reviews(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX reviews_user_id_idx  ON reviews(user_id);

-- Moderation
CREATE INDEX moderation_queue_status_idx ON moderation_queue(status);
CREATE INDEX reports_status_idx          ON reports(status);
CREATE INDEX organizer_requests_user_idx ON organizer_requests(user_id);
```

---

## 7. Row-Level Security (RLS) Policies

> **All tables have RLS enabled.** RLS is the last line of defense. Server Actions also check roles, but RLS must always be active and correct.

### 7.1 Enable RLS

```sql
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE places                ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue      ENABLE ROW LEVEL SECURITY;
```

### 7.2 `profiles`

```sql
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
  -- Prevents a user from escalating their own role via UPDATE
```

> **NOTE:** No INSERT policy — rows are only created by the `handle_new_user` trigger (SECURITY DEFINER).

### 7.3 `organizer_requests`

```sql
CREATE POLICY "organizer_requests_insert_member"
  ON organizer_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "organizer_requests_select_own"
  ON organizer_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "organizer_requests_select_admin"
  ON organizer_requests FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "organizer_requests_update_admin"
  ON organizer_requests FOR UPDATE
  USING (get_my_role() = 'admin');
```

### 7.4 `places`

```sql
CREATE POLICY "places_select_published"
  ON places FOR SELECT USING (status = 'published');

CREATE POLICY "places_select_own"
  ON places FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "places_select_admin"
  ON places FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "places_insert_organizer"
  ON places FOR INSERT
  WITH CHECK (get_my_role() IN ('organizer', 'admin') AND auth.uid() = created_by);

CREATE POLICY "places_update_own_draft"
  ON places FOR UPDATE
  USING (auth.uid() = created_by AND status IN ('draft', 'pending'));

CREATE POLICY "places_update_admin"
  ON places FOR UPDATE
  USING (get_my_role() = 'admin');
```

> **NOTE:** No DELETE policy from the client. Deletes (if needed) are admin-only operations via service role.

### 7.5 `events`

```sql
CREATE POLICY "events_select_published"
  ON events FOR SELECT USING (status = 'published');

CREATE POLICY "events_select_own"
  ON events FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "events_select_admin"
  ON events FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "events_insert_organizer"
  ON events FOR INSERT
  WITH CHECK (get_my_role() IN ('organizer', 'admin') AND auth.uid() = created_by);

CREATE POLICY "events_update_own_draft"
  ON events FOR UPDATE
  USING (auth.uid() = created_by AND status IN ('draft', 'pending'));

CREATE POLICY "events_update_admin"
  ON events FOR UPDATE
  USING (get_my_role() = 'admin');
```

### 7.6 `tags`

```sql
CREATE POLICY "tags_select_all"    ON tags FOR SELECT USING (true);
CREATE POLICY "tags_insert_admin"  ON tags FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "tags_update_admin"  ON tags FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "tags_delete_admin"  ON tags FOR DELETE USING (get_my_role() = 'admin');
```

### 7.7 `place_tags` / `event_tags`

```sql
-- place_tags
CREATE POLICY "place_tags_select_all"
  ON place_tags FOR SELECT USING (true);
CREATE POLICY "place_tags_write_organizer"
  ON place_tags FOR ALL
  WITH CHECK (get_my_role() IN ('organizer', 'admin'));

-- event_tags
CREATE POLICY "event_tags_select_all"
  ON event_tags FOR SELECT USING (true);
CREATE POLICY "event_tags_write_organizer"
  ON event_tags FOR ALL
  WITH CHECK (get_my_role() IN ('organizer', 'admin'));
```

### 7.8 `reviews`

```sql
CREATE POLICY "reviews_select_published"
  ON reviews FOR SELECT USING (status = 'published');

CREATE POLICY "reviews_select_own"
  ON reviews FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reviews_select_admin"
  ON reviews FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "reviews_insert_authenticated"
  ON reviews FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_update_admin"
  ON reviews FOR UPDATE USING (get_my_role() = 'admin');
```

### 7.9 `reports`

```sql
CREATE POLICY "reports_insert_authenticated"
  ON reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = reporter_id);

CREATE POLICY "reports_select_own"
  ON reports FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "reports_select_admin"
  ON reports FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "reports_update_admin"
  ON reports FOR UPDATE USING (get_my_role() = 'admin');
```

### 7.10 `moderation_queue`

```sql
CREATE POLICY "moderation_queue_insert_organizer"
  ON moderation_queue FOR INSERT
  WITH CHECK (get_my_role() IN ('organizer', 'admin') AND auth.uid() = submitted_by);

CREATE POLICY "moderation_queue_select_own"
  ON moderation_queue FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "moderation_queue_select_admin"
  ON moderation_queue FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "moderation_queue_update_admin"
  ON moderation_queue FOR UPDATE USING (get_my_role() = 'admin');
```

---

## 8. Storage Configuration

### 8.1 Bucket: `event-images`

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  false,                                -- Not publicly accessible by default
  5242880,                              -- 5 MB maximum file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

**Storage path convention:** `event-images/{event_id}/{uuid}.webp`
- `event_id` provides namespace isolation per event
- `uuid` makes the path unguessable (prevents enumeration)
- `.webp` is always the output format after sharp processing

### 8.2 Storage RLS Policies

```sql
-- Authenticated organizers/admins can upload
CREATE POLICY "event_images_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-images'
    AND auth.role() = 'authenticated'
    AND get_my_role() IN ('organizer', 'admin')
  );

-- Organizers can read images they own (for preview before publishing)
CREATE POLICY "event_images_read_authenticated"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'event-images'
    AND auth.role() = 'authenticated'
  );

-- Public read only for images belonging to published events
-- NOTE: This policy layers on top — Supabase evaluates all matching policies
CREATE POLICY "event_images_read_published"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'event-images'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.primary_image_path = name
        AND e.status = 'published'
    )
  );

-- Admins can delete images
CREATE POLICY "event_images_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-images'
    AND get_my_role() = 'admin'
  );
```

### 8.3 Image Upload Flow

```
1. Client selects file in EventImageUpload component
2. Client POSTs multipart/form-data to /api/upload/event-image
3. Route handler:
   a. Verifies session: supabase.auth.getUser() — must be organizer or admin
   b. Reads file from FormData
   c. Validates file size (≤ 5 MB) — reject with 413 if exceeded
   d. Validates MIME type using `file-type` library (magic bytes, not extension) — reject with 400 if invalid
   e. Processes with sharp: resize to max 1200px wide, convert to WebP, quality 85
   f. Generates upload path: event-images/{event_id}/{crypto.randomUUID()}.webp
   g. Uploads to Supabase Storage using admin client
   h. Returns JSON: { path: "event-images/{event_id}/{uuid}.webp" }
4. Client stores returned path in EventForm state field `primary_image_path`
5. On form submit, primary_image_path is saved in the events table
```

> **SECURITY:** Always use `file-type` for MIME validation. `Content-Type` headers can be spoofed by the client. Magic bytes cannot.

---

## 9. Authentication & Authorization Model

### 9.1 Supabase Auth Configuration

| Provider | Config |
|---|---|
| Email + Password | Enabled; email confirmation required before first sign-in |
| Google OAuth | Enabled in Supabase dashboard; callback URL: `{NEXT_PUBLIC_APP_URL}/auth/callback` |
| Magic Link (email) | Enabled; link expires in 1 hour; one-time use |

### 9.2 Session Management

- Sessions are stored in **HttpOnly, Secure cookies** managed by `@supabase/ssr`
- Access tokens expire in **1 hour**; refresh tokens rotate on each use
- `middleware.ts` refreshes the session on every request to prevent token expiry mid-session
- **Critical:** Use `supabase.auth.getUser()` in Server Actions — this verifies the JWT with the Supabase Auth server. Do NOT use `supabase.auth.getSession()` alone on the server, which only reads the cookie without re-validation

### 9.3 Route Protection (middleware.ts)

```
Pattern: check session → read role from profiles table → redirect if unauthorized

/organizer/* → requires role IN ('organizer', 'admin') → else redirect to /auth/sign-in
/admin/*     → requires role = 'admin'                 → else redirect to / (not sign-in, to avoid info leak)
```

### 9.4 Organizer Role Escalation Flow

```
1. Member visits a profile/settings page with "Become an Organizer" CTA
2. Member fills OrganizerRequestForm (optional message explaining intent)
3. requestOrganizerRole() Server Action:
   - Verifies user is authenticated
   - Checks no pending request already exists (unique partial index enforces this at DB level too)
   - INSERTs row in organizer_requests (status: 'pending')
   - Sends email to ADMIN_NOTIFICATION_EMAIL via OrganizerRequestReceived template
4. Admin visits /admin/organizer-requests
5. Admin approves:
   - approveOrganizerRequest() Server Action (admin client):
     a. UPDATEs profiles SET role = 'organizer' WHERE id = request.user_id
     b. UPDATEs organizer_requests SET status = 'approved', reviewed_by, reviewed_at
     c. Sends OrganizerRequestDecision email to requester (approved = true)
6. Admin rejects:
   - rejectOrganizerRequest() Server Action:
     a. UPDATEs organizer_requests SET status = 'rejected', reviewed_by, reviewed_at
     b. Sends OrganizerRequestDecision email to requester (approved = false)
```

### 9.5 Auth Callback Route (`/auth/callback`)

Handles OAuth code exchange AND magic link token exchange in a single route.

```typescript
// Pseudocode for /auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Sanitize redirect: reject external domains
  const redirectTo = next.startsWith('/') ? next : '/'

  if (code) {
    const supabase = createServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${redirectTo}`)
}
```

> **SECURITY:** Always sanitize the `next` parameter. Only allow relative paths (starting with `/`). Reject any URL with a different origin to prevent open redirect attacks.

### 9.6 Admin Role Assignment

> **There is no UI or API to grant the `admin` role.** It must be set directly in the database:
> ```sql
> UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
> ```
> This is an intentional security decision. Only the project owner (with DB access) can create admins.

---

## 10. Email Notification System

### 10.1 Setup

- **Provider:** Resend
- **SDK:** `resend` npm package
- **Templates:** React Email (`@react-email/components`)
- **Client:** `src/lib/email/client.ts` — a singleton `Resend` instance
- **All email sending happens in Server Actions ONLY** — never in client components

### 10.2 Email Templates

| Template File | Trigger | Recipient | Key Data |
|---|---|---|---|
| `SubmissionApproved.tsx` | Admin approves place or event | Organizer (created_by) | itemTitle, itemType, link to published item |
| `SubmissionRejected.tsx` | Admin rejects place or event | Organizer (created_by) | itemTitle, itemType, rejection note |
| `OrganizerRequestReceived.tsx` | User submits organizer role request | `ADMIN_NOTIFICATION_EMAIL` | requesterName, requesterEmail, optional message, admin review link |
| `OrganizerRequestDecision.tsx` | Admin approves or rejects organizer request | Requesting user | approved: boolean, if rejected: reason (optional) |

### 10.3 Sending Pattern

```typescript
// Always in a Server Action — never in a component
import { resend } from '@/lib/email/client'
import { SubmissionApproved } from '@/lib/email/templates/SubmissionApproved'

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL!,
  to: recipientEmail,
  subject: `Your submission "${itemTitle}" has been approved`,
  react: <SubmissionApproved itemTitle={itemTitle} itemType={itemType} itemUrl={itemUrl} />,
})
```

---

## 11. Route Architecture

### 11.1 Public Routes

#### `/` (Homepage)
- **Component type:** Server Component
- **Data sources:**
  - Events: `SELECT * FROM events WHERE status = 'published' AND starts_at >= now() ORDER BY starts_at ASC LIMIT 20`
  - Places: `SELECT * FROM places WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
- **UI:** Two tabs — "Events" (default/active) + "Places"
- **Search:** SearchBar updates URL search params (`?q=`) to filter results

#### `/explore`
- **Component type:** Server Component page; **Client Component** map (`ExploreMap`)
- **Data source:** All published places with lat/lng; join with upcoming events count
- **Map:** Dynamically imported with `ssr: false` to prevent server-side Mapbox errors
- **Filters via URL params:** `?neighborhood=&tag=&is_free=&indoors=&outdoors=`
- **Default map center:** Seattle (lat: 47.6062, lng: -122.3321), zoom: 12

#### `/places`
- **Component type:** Server Component
- **Data:** Published places, paginated (20/page), `ORDER BY created_at DESC`
- **Filters via URL params:** `?q=&neighborhood=&tag=&indoors=&outdoors=&is_free=&page=`

#### `/places/[id]`
- **Data:** Place record + `place_tags(tags(*))` + upcoming related events + reviews with average rating
- **Components used:** `PlaceMapSnippet`, `ReviewList`, `ReviewForm`, `EventList`

#### `/events`
- **Component type:** Server Component
- **Data:** Published events where `starts_at >= now()`, `ORDER BY starts_at ASC`
- **Filters:** Same pattern as places

#### `/events/[id]`
- **Data:** Event record + place name/address + `event_tags(tags(*))` + reviews
- **Image:** Displayed from Supabase Storage using the `primary_image_path` storage path

#### `/auth/sign-in`
- Server Component page wrapping Client Component `SignInForm`
- Three flows: email+password, Google OAuth button (calls `signInWithGoogle` action), magic link option

#### `/auth/sign-up`
- Server Component page wrapping Client Component `SignUpForm`
- Captures: display_name, email, password
- On success: shows "check your email" message (email confirmation required)

---

### 11.2 Organizer Routes

#### `/organizer` (dashboard)
- Requires role IN ('organizer', 'admin') — enforced in `organizer/layout.tsx`
- Shows: my draft/pending/published places count, upcoming events, recent moderation_queue status

#### `/organizer/places/new`
- Renders `PlaceForm` with no initial data
- On submit: calls `createPlace()` → on success, `submitPlaceForReview()` (or save as draft)

#### `/organizer/places/[id]/edit`
- Fetches place (must be `created_by = current user` AND `status IN ('draft', 'pending')`)
- Renders `PlaceForm` with initial data
- On submit: calls `updatePlace()`

#### `/organizer/events/new`
- Renders `EventForm` with `EventImageUpload`
- Place selector: shows only organizer's published places
- Image must be uploaded before submission

#### `/organizer/events/[id]/edit`
- Same as above with initial data

---

### 11.3 Admin Routes

#### `/admin` (overview)
- Requires role = 'admin' — enforced in `admin/layout.tsx`
- Stats: pending moderation count, open reports count, pending organizer requests count

#### `/admin/moderation`
- Table: `moderation_queue WHERE status = 'pending'` joined with item details
- Actions: **Approve** (no note required) | **Reject** (note required — shown to organizer in email)
- On approve: item `status → 'published'`, queue entry `status → 'approved'`, email to organizer
- On reject: item `status → 'rejected'`, queue entry `status → 'rejected'`, email to organizer

#### `/admin/reports`
- Table: `reports WHERE status = 'open'` with reporter info and target info
- Actions: **Triage** (acknowledge; status → 'triaged') | **Close** (status → 'closed')
- Optional: hide the reported content when closing a report

#### `/admin/tags`
- List of all tags grouped by kind
- Create tag: name + kind (theme|category)
- Delete tag: **Warning shown** — deletion cascades to all `place_tags`/`event_tags`

#### `/admin/organizer-requests`
- Table: `organizer_requests WHERE status = 'pending'` with user info and message
- Actions: **Approve** | **Reject**

---

### 11.4 API Routes

#### `POST /api/upload/event-image`
- **Auth:** Required — session must have role IN ('organizer', 'admin')
- **Input:** `multipart/form-data` — field name: `file`, field name: `eventId`
- **Processing:** MIME check → size check → sharp resize/compress → Storage upload
- **Output:** `{ path: string }` (the Supabase Storage path)
- **Error codes:** `401` (no session), `403` (wrong role), `400` (invalid MIME), `413` (too large), `500` (storage error)

---

## 12. Server Actions Reference

> **All Server Actions must:**
> 1. Begin with `'use server'` at the file top
> 2. Call `createServerClient()` from `@/lib/supabase/server`
> 3. Verify auth with `const { data: { user } } = await supabase.auth.getUser()` — return error if null
> 4. Validate all input with the corresponding Zod schema before any DB operation
> 5. Return typed result: `{ data: T | null, error: string | null }`
> 6. Never throw — catch errors and return them in the error field

### `actions/places.ts`

| Action | Input | Role Required | Notes |
|---|---|---|---|
| `createPlace(data)` | PlaceFormValues | organizer \| admin | Sets status = 'draft'; sets dedupe_key |
| `updatePlace(id, data)` | id + PlaceFormValues | own organizer \| admin | Only if status IN ('draft', 'pending') |
| `submitPlaceForReview(id)` | place id | own organizer \| admin | Sets status = 'pending'; creates moderation_queue entry |
| `publishPlace(id)` | place id | admin | Sets status = 'published'; sends SubmissionApproved email |
| `hidePlace(id)` | place id | admin | Sets status = 'hidden' |
| `rejectPlace(id, note)` | place id + note text | admin | Sets status = 'rejected'; sends SubmissionRejected email with note |

### `actions/events.ts`

| Action | Input | Role Required | Notes |
|---|---|---|---|
| `createEvent(data)` | EventFormValues | organizer \| admin | Validates primary_image_path is set; sets dedupe_key |
| `updateEvent(id, data)` | id + EventFormValues | own organizer \| admin | Only if status IN ('draft', 'pending') |
| `submitEventForReview(id)` | event id | own organizer \| admin | Validates primary_image_path present; sets status = 'pending' |
| `publishEvent(id)` | event id | admin | Sets status = 'published'; sends approval email |
| `hideEvent(id)` | event id | admin | Sets status = 'hidden' |
| `rejectEvent(id, note)` | event id + note | admin | Sets status = 'rejected'; sends rejection email |

### `actions/reviews.ts`

| Action | Input | Role Required | Notes |
|---|---|---|---|
| `createReview(data)` | ReviewFormValues | any authenticated (member+) | Enforces one review per user per target at DB level |
| `hideReview(id)` | review id | admin | Sets status = 'hidden' |

### `actions/moderation.ts`

| Action | Input | Role Required | Notes |
|---|---|---|---|
| `approveSubmission(queueId)` | queue entry id | admin | Calls publishPlace or publishEvent based on item_type |
| `rejectSubmission(queueId, note)` | queue id + note | admin | Calls rejectPlace or rejectEvent |
| `triageReport(reportId)` | report id | admin | Sets status = 'triaged' |
| `closeReport(reportId, hideContent?)` | report id + optional bool | admin | Sets status = 'closed'; optionally hides target |

### `actions/organizer-requests.ts`

| Action | Input | Role Required | Notes |
|---|---|---|---|
| `requestOrganizerRole(message?)` | optional message | any authenticated | Checks no pending request exists; inserts request; emails admin |
| `approveOrganizerRequest(requestId)` | request id | admin | Uses admin client to update profile role; emails user |
| `rejectOrganizerRequest(requestId)` | request id | admin | Updates request status; emails user |

### `actions/auth.ts`

| Action | Input | Role Required | Notes |
|---|---|---|---|
| `signUp(data)` | SignUpFormValues | none | Creates auth user + profile (via trigger); sends confirmation email |
| `signIn(data)` | SignInFormValues | none | Email+password |
| `signOut()` | — | any authenticated | Clears session cookie |
| `signInWithGoogle()` | — | none | Returns OAuth redirect URL |
| `requestMagicLink(email)` | email | none | Sends magic link; always returns success (no email enumeration) |
| `updateProfile(data)` | { display_name } | own profile | Updates display_name only |

---

## 13. Component Architecture

### 13.1 Component Type Rules

| Type | When to Use | Rules |
|---|---|---|
| **Server Component** (default) | Pages, layouts, data-fetching wrappers | No `useState`, `useEffect`, no browser APIs, no event handlers |
| **Client Component** (`'use client'`) | Interactive UI, forms, maps, hooks | Keep as leaf nodes when possible; push data fetching to parent Server Components |
| **shadcn/ui** (`src/components/ui/`) | Primitive UI elements | Never edit manually — always use `npx shadcn@latest add` |

### 13.2 Data Fetching Pattern (Server Component)

```typescript
// Preferred: direct Supabase query in Server Component
import { createServerClient } from '@/lib/supabase/server'

export default async function PlacesPage({ searchParams }) {
  const supabase = await createServerClient()
  const q = searchParams.q ?? ''

  const { data: places, error } = await supabase
    .from('places')
    .select(`
      *,
      place_tags ( tag_id, tags ( id, name, kind ) )
    `)
    .eq('status', 'published')
    .textSearch('name', q, { config: 'english' })  // FTS — empty string handled gracefully
    .order('created_at', { ascending: false })
    .range(0, 19)

  if (error) throw error  // Caught by error.tsx boundary

  return <PlaceList places={places} />
}
```

### 13.3 Form Pattern (Client Component)

```typescript
'use client'
// Pattern: react-hook-form + Zod + Server Action
// 1. Import Zod schema from lib/validations/
// 2. useForm with zodResolver
// 3. onSubmit calls the Server Action
// 4. Handle { data, error } return from action
// 5. Show toast on success/error
```

### 13.4 Map Component Requirement

```typescript
// ExploreMap MUST be dynamically imported to prevent SSR errors
// In explore/page.tsx:
import dynamic from 'next/dynamic'

const ExploreMap = dynamic(() => import('@/components/map/ExploreMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})
```

### 13.5 Key Component Props Contracts

| Component | Key Props |
|---|---|
| `PlaceForm` | `initialData?: Place`, `onSuccess?: (place: Place) => void` |
| `EventForm` | `initialData?: Event`, `availablePlaces: Place[]`, `onSuccess?: (event: Event) => void` |
| `ReviewForm` | `targetType: 'place' \| 'event'`, `targetId: string` |
| `ExploreMap` | `places: PlaceWithCoords[]`, `onMarkerClick: (id: string) => void` |
| `EventImageUpload` | `eventId: string`, `currentPath?: string`, `onUploadComplete: (path: string) => void` |

---

## 14. Security Posture

### 14.1 HTTP Security Headers (`next.config.ts`)

```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-XSS-Protection',        value: '1; mode=block' },
  { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  {
    key: 'Strict-Transport-Security',
    // Only apply HSTS in production
    value: process.env.NODE_ENV === 'production'
      ? 'max-age=63072000; includeSubDomains; preload'
      : '',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-eval is required by Mapbox GL JS (WebGL shader compilation)
      "script-src 'self' 'unsafe-eval' https://api.mapbox.com",
      // unsafe-inline required for Mapbox GL inline styles
      "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
      "img-src 'self' data: blob: https://*.supabase.co https://api.mapbox.com https://events.mapbox.com",
      "worker-src blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://o*.ingest.sentry.io",
      "font-src 'self'",
      "frame-src 'none'",
    ].join('; '),
  },
]
```

> **NOTE:** `unsafe-eval` is required by Mapbox GL JS for WebGL shader compilation. This is a known, accepted trade-off documented at [mapbox.com/mapbox-gl-js/overview/](https://docs.mapbox.com/mapbox-gl-js/overview/). All other script sources are controlled.

### 14.2 Authentication Security

- `supabase.auth.getUser()` used in all server-side auth checks (re-validates token server-side)
- `supabase.auth.getSession()` alone is **never** used on the server (trusts cookie without verification)
- Role is always read from the `profiles` table server-side — never from JWT custom claims
- OAuth redirect `next` parameter sanitized: only relative paths accepted; external domains rejected
- Magic link: always returns success message regardless of whether email exists (prevents email enumeration)

### 14.3 Input Validation

- Zod schemas defined in `src/lib/validations/` — identical schema used on client (react-hook-form) AND server (Server Actions)
- Server Actions always re-validate even if client already validated
- Database: Supabase client uses parameterized queries — no raw SQL from user input
- React handles HTML escaping by default — only sanitize if directly setting `dangerouslySetInnerHTML`

### 14.4 File Upload Security

- MIME type validated with `file-type` library (magic bytes) — not the `Content-Type` header (spoofable)
- File size enforced in route handler (413 error) before reading full content
- `sharp` re-encodes images to WebP — strips all EXIF metadata and embedded scripts
- Upload paths are UUID-based — unguessable, preventing enumeration
- Storage RLS policies restrict access to published events only (for anonymous reads)

### 14.5 Secrets Management

- All secrets in environment variables; never in code or version control
- `.env.local.example` committed with placeholder values only
- `SUPABASE_SERVICE_ROLE_KEY` used only in `src/lib/supabase/admin.ts`
- Admin client (`supabase/admin.ts`) never imported in the `(public)/` route group or `components/`

### 14.6 Rate Limiting (to implement)

- `/api/upload/event-image`: max 10 requests/minute per IP
- Auth endpoints: Supabase Auth has built-in rate limiting
- Option: `@upstash/ratelimit` with Vercel Edge middleware if additional limiting is needed

### 14.7 Dependency Security

- `npm audit` runs on every CI build
- Dependabot configured to create PRs for security patches
- `next.config.ts`: `poweredByHeader: false` (removes X-Powered-By: Next.js header)

### 14.8 CSRF Protection

- Next.js Server Actions use same-origin cookie checks — inherently CSRF-protected
- API route handlers check `Origin` header for non-GET requests

---

## 15. Deployment & CI/CD

### 15.1 Environments

| Environment | Trigger | URL | Supabase |
|---|---|---|---|
| Local development | Manual | `localhost:3000` | Local Supabase (`supabase start`) |
| Preview | Push to any feature branch | Auto Vercel preview URL | Staging Supabase project |
| Production | Merge to `main` | `yourdomain.com` | Production Supabase project |

### 15.2 GitHub Actions (`ci.yml`)

Runs on every pull request targeting `main`:

```yaml
steps:
  - npm ci
  - npx tsc --noEmit              # Type checking
  - npx eslint . --max-warnings 0  # Linting (zero warnings allowed)
  - npm run build                  # Build verification
  - npm audit --audit-level high   # Security audit (fails on high+ severity)
```

### 15.3 Vercel Configuration

- Framework preset: **Next.js**
- Root directory: project root
- Build command: `npm run build`
- All environment variables set in Vercel dashboard — never in code
- Preview deployments: enabled for all branches

### 15.4 Supabase Migration Deployment

```bash
# Local development
supabase start
supabase db push

# Production (in CI or manually)
supabase link --project-ref <project-ref>
supabase db push

# NEVER run in production:
# supabase db reset   ← destroys all data
```

### 15.5 Post-Deploy Checklist

- [ ] Run `supabase db push` for any new migrations
- [ ] Run `supabase gen types` and commit updated `database.types.ts`
- [ ] Verify Sentry DSN is set and receiving events
- [ ] Verify Mapbox token is domain-restricted in Mapbox dashboard
- [ ] Verify Resend sender domain is verified
- [ ] Test auth callback URL in Google OAuth console matches production URL

---

## 16. Agent Execution Plan

> This section defines discrete implementation modules for AI agents. Each module is self-contained and references exact files. Modules with the same Phase number MAY be executed in parallel. Lower-numbered phases must complete before higher-numbered ones begin.

### Phase 0 — Project Initialization

#### Module 0.1 — Next.js Project Bootstrap
**What it builds:** The skeleton Next.js project with all config files.
**Files to create/modify:**
- `package.json` (all dependencies from Section 3)
- `tsconfig.json` — strict mode, path aliases (`@/*` → `src/*`)
- `tailwind.config.ts` — content paths, no custom theme extensions for now
- `next.config.ts` — security headers (Section 14.1), `poweredByHeader: false`, image remote patterns for Supabase storage
- `.eslintrc.json` — extends `next/core-web-vitals`
- `.prettierrc` — `{ "plugins": ["prettier-plugin-tailwindcss"] }`
- `.env.local.example` — all env vars from Section 5 with placeholder values
- `.gitignore` — standard Next.js gitignore + `.env.local`
- `src/app/layout.tsx` — root layout (fonts, providers placeholder)
- `src/app/not-found.tsx` — simple 404 page
- `src/app/error.tsx` — error boundary

**Dependencies:** None.
**Acceptance criteria:** `npm run build` succeeds. `npx tsc --noEmit` passes.

---

#### Module 0.2 — Supabase Migrations
**What it builds:** All SQL migration files.
**Files to create:**
- `supabase/config.toml`
- `supabase/migrations/00001_initial_schema.sql` — all tables + enums + constraints from Section 6
- `supabase/migrations/00002_functions.sql` — all functions + triggers from Section 6.3
- `supabase/migrations/00003_rls_policies.sql` — all RLS policies from Section 7
- `supabase/migrations/00004_storage.sql` — bucket + storage policies from Section 8.1–8.2
- `supabase/migrations/00005_seed_tags.sql` — placeholder (see Open Decisions #1)
- `supabase/seed.sql` — dev seed data

**Dependencies:** None.
**Acceptance criteria:** `supabase start && supabase db push` succeeds with no errors. Tables visible in Supabase Studio.

---

#### Module 0.3 — shadcn/ui Installation
**What it builds:** UI component library setup.
**Commands:**
```bash
npx shadcn@latest init
npx shadcn@latest add button card input label badge tabs dialog select textarea toast form table avatar dropdown-menu separator skeleton alert
```
**Files created:** `components.json`, `src/components/ui/*`, `src/lib/utils.ts`
**Dependencies:** Module 0.1.
**Acceptance criteria:** All listed components exist in `src/components/ui/`. `src/lib/utils.ts` exports `cn()`.

---

### Phase 1 — Foundation Libraries (depends on Phase 0)

#### Module 1.1 — Supabase Client Setup
**What it builds:** All Supabase client utilities + TypeScript types.
**Files to create:**
- `src/lib/supabase/client.ts` — `createBrowserClient` (for 'use client' components)
- `src/lib/supabase/server.ts` — `createServerClient` (for Server Components, Actions, Route Handlers)
- `src/lib/supabase/admin.ts` — service role client (for role updates, bypassing RLS)
- `src/lib/supabase/database.types.ts` — generated via `supabase gen types`
- `src/types/index.ts` — app-level type aliases

**Dependencies:** Module 0.1, Module 0.2.
**Acceptance criteria:** All clients importable without TypeScript errors. Types file generated and up-to-date.

---

#### Module 1.2 — Middleware & Auth Callbacks
**What it builds:** Session refresh middleware + auth callback routes.
**Files to create:**
- `middleware.ts` — session refresh on every request; protect `/organizer/*` and `/admin/*`
- `src/app/auth/callback/route.ts` — OAuth + magic link code exchange
- `src/app/auth/confirm/route.ts` — email confirmation handler

**Dependencies:** Module 1.1.
**Acceptance criteria:** Visiting `/organizer` without a session redirects to `/auth/sign-in`. Visiting `/admin` without admin role redirects to `/`.

---

### Phase 2 — Auth UI (depends on Phase 1)

#### Module 2.1 — Auth Pages & Forms
**What it builds:** Sign-up, sign-in pages + all auth Server Actions.
**Files to create:**
- `src/lib/validations/auth.ts` — Zod: SignUpSchema (display_name, email, password), SignInSchema
- `src/actions/auth.ts` — all auth Server Actions
- `src/components/auth/SignInForm.tsx` — email+password + Google button + magic link option
- `src/components/auth/SignUpForm.tsx` — display_name + email + password
- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`

**Dependencies:** Module 1.1, Module 1.2.
**Acceptance criteria:** User can sign up with email (receives confirmation email). User can sign in. Google OAuth redirects correctly. Magic link email triggers correctly.

---

### Phase 3 — Public Layout (depends on Phase 1)

#### Module 3.1 — Shell Components
**What it builds:** Root layout shell with Header, Footer, PageContainer.
**Files to create:**
- `src/hooks/useUser.ts` — reads session, fetches profile row, returns `{ user, profile, role, isLoading }`
- `src/components/layout/Header.tsx` — logo, nav links, auth state indicator, role-aware (organizer/admin links)
- `src/components/layout/Footer.tsx`
- `src/components/layout/PageContainer.tsx` — max-w-7xl centered wrapper
- `src/app/(public)/layout.tsx` — wraps pages with Header + Footer + PageContainer
- `src/lib/utils.ts` — extend with `formatDate()`, `formatRelativeTime()`, `truncate()`

**Dependencies:** Module 0.3, Module 2.1.
**Acceptance criteria:** All public pages render with consistent header and footer.

---

### Phase 4 — Core Data UI (depends on Phase 1, Phase 3)

#### Module 4.1 — Place Components & Pages
**What it builds:** Place browsing, listing, and detail UI.
**Files to create:**
- `src/lib/validations/place.ts` — Zod: PlaceSchema
- `src/components/places/PlaceCard.tsx`
- `src/components/places/PlaceList.tsx`
- `src/app/(public)/places/page.tsx` — with filter support via searchParams
- `src/app/(public)/places/[id]/page.tsx`

**Dependencies:** Module 3.1.
**Acceptance criteria:** `/places` lists published places. `/places/[id]` renders place detail.

---

#### Module 4.2 — Event Components & Pages
**What it builds:** Event browsing, listing, and detail UI.
**Files to create:**
- `src/lib/validations/event.ts` — Zod: EventSchema (includes primary_image_path required for submission)
- `src/components/events/EventCard.tsx`
- `src/components/events/EventList.tsx`
- `src/app/(public)/events/page.tsx`
- `src/app/(public)/events/[id]/page.tsx`

**Dependencies:** Module 3.1.
**Acceptance criteria:** `/events` lists upcoming published events. `/events/[id]` renders event detail with image.

---

#### Module 4.3 — Homepage Feed
**What it builds:** Tabbed homepage with Events and Places feeds.
**Files to create:**
- `src/components/search/SearchBar.tsx` — debounced; updates `?q=` URL param
- `src/app/(public)/page.tsx` — two tabs (Events upcoming + Places recent)

**Dependencies:** Module 4.1, Module 4.2.
**Acceptance criteria:** Homepage shows two tabs. Events tab defaults active. Search bar filters within the active tab.

---

### Phase 5 — Maps (depends on Phase 4)

#### Module 5.1 — Mapbox & Explore Page
**What it builds:** Interactive map explore page with filtering.
**Files to create:**
- `src/lib/mapbox.ts` — token export, default Seattle center/zoom constants
- `src/components/map/MapPin.tsx`
- `src/components/map/MapFilterPanel.tsx`
- `src/components/map/ExploreMap.tsx` — Client Component; Mapbox GL with clustering
- `src/components/places/PlaceMapSnippet.tsx` — small static map for detail pages
- `src/app/(public)/explore/page.tsx` — loads `ExploreMap` with `dynamic({ ssr: false })`
- `src/hooks/useMap.ts`

**Dependencies:** Module 4.1.
**Security note:** `NEXT_PUBLIC_MAPBOX_TOKEN` must be domain-restricted before launch.
**Acceptance criteria:** `/explore` renders map centered on Seattle. Markers appear for published places. Clicking a marker shows a popup with place name. Filter panel updates visible markers.

---

### Phase 6 — Reviews & Reports (depends on Phase 4)

#### Module 6.1 — Review System
**What it builds:** Review display and submission for places and events.
**Files to create:**
- `src/lib/validations/review.ts`
- `src/components/reviews/ReviewCard.tsx`
- `src/components/reviews/ReviewList.tsx` — displays avg rating header
- `src/components/reviews/ReviewForm.tsx` — shows auth prompt to visitors
- `src/actions/reviews.ts`

**Files to modify:**
- `src/app/(public)/places/[id]/page.tsx` — add ReviewList + ReviewForm
- `src/app/(public)/events/[id]/page.tsx` — add ReviewList + ReviewForm

**Dependencies:** Module 4.1, Module 4.2.
**Acceptance criteria:** Authenticated users can submit one review per place/event. Reviews display on detail pages. Duplicate review submission is rejected by DB constraint.

---

### Phase 7 — Image Upload (depends on Phase 1)

#### Module 7.1 — Upload API & Component
**What it builds:** Server-side image processing and upload endpoint.
**Files to create:**
- `src/app/api/upload/event-image/route.ts` — full upload flow (Section 8.3)
- `src/components/events/EventImageUpload.tsx` — client component; calls upload API; shows preview

**Dependencies:** Module 1.1.
**Security note:** This module MUST implement magic-byte MIME validation with `file-type` and re-encoding with `sharp`. No shortcuts.
**Acceptance criteria:** Valid images upload and return a storage path. Invalid MIME types return 400. Files over 5 MB return 413.

---

### Phase 8 — Organizer Flow (depends on Phase 2, Phase 4, Phase 7)

#### Module 8.1 — Organizer Dashboard & CRUD
**What it builds:** All organizer-facing pages + Server Actions.
**Files to create:**
- `src/app/organizer/layout.tsx` — role guard
- `src/app/organizer/page.tsx`
- `src/app/organizer/places/page.tsx`
- `src/app/organizer/places/new/page.tsx`
- `src/app/organizer/places/[id]/edit/page.tsx`
- `src/app/organizer/events/page.tsx`
- `src/app/organizer/events/new/page.tsx`
- `src/app/organizer/events/[id]/edit/page.tsx`
- `src/components/places/PlaceForm.tsx`
- `src/components/events/EventForm.tsx` — integrates EventImageUpload
- `src/actions/places.ts`
- `src/actions/events.ts`

**Dependencies:** Module 2.1, Module 4.1, Module 4.2, Module 7.1.
**Acceptance criteria:** Organizer can create place (status: draft). Organizer can submit for review (status: pending). Edit blocked for published items. Event requires image before submission.

---

#### Module 8.2 — Organizer Role Request
**What it builds:** Member-to-organizer request flow.
**Files to create:**
- `src/components/auth/OrganizerRequestForm.tsx`
- `src/actions/organizer-requests.ts`

**Files to modify:**
- Add request form to organizer dashboard or a profile settings page

**Dependencies:** Module 2.1.
**Acceptance criteria:** Member can submit organizer request. Duplicate pending request is rejected. Admin receives notification email.

---

### Phase 9 — Email Notifications (depends on Phase 8)

#### Module 9.1 — Resend + Email Templates
**What it builds:** Full transactional email system.
**Files to create:**
- `src/lib/email/client.ts`
- `src/lib/email/templates/SubmissionApproved.tsx`
- `src/lib/email/templates/SubmissionRejected.tsx`
- `src/lib/email/templates/OrganizerRequestReceived.tsx`
- `src/lib/email/templates/OrganizerRequestDecision.tsx`

**Files to modify:**
- `src/actions/organizer-requests.ts` — add email sends
- `src/actions/moderation.ts` (created in next phase — plan email send here)

**Dependencies:** Module 8.2.
**Acceptance criteria:** Email sends in dev using Resend test mode. Templates render correctly via React Email preview.

---

### Phase 10 — Admin Flow (depends on Phase 8, Phase 9)

#### Module 10.1 — Admin Dashboard & Tools
**What it builds:** All admin pages + moderation Server Actions.
**Files to create:**
- `src/app/admin/layout.tsx` — admin guard
- `src/app/admin/page.tsx`
- `src/app/admin/moderation/page.tsx`
- `src/app/admin/reports/page.tsx`
- `src/app/admin/tags/page.tsx`
- `src/app/admin/organizer-requests/page.tsx`
- `src/components/moderation/ModerationQueueTable.tsx`
- `src/components/moderation/ModerationActions.tsx`
- `src/components/moderation/ReportsTable.tsx`
- `src/actions/moderation.ts`
- `src/actions/tags.ts`

**Dependencies:** Module 8.1, Module 9.1.
**Acceptance criteria:** Admin can approve/reject submissions (triggers emails). Admin can approve/reject organizer requests (triggers emails). Admin can create/delete tags. Reports show with triage/close actions.

---

### Phase 11 — Infrastructure (parallel-safe from Phase 3 onward)

#### Module 11.1 — Sentry Integration
**What it builds:** Error tracking and monitoring.
**Commands:**
```bash
npx @sentry/wizard@latest -i nextjs
```
**Files created/modified:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.ts`
**Dependencies:** Module 0.1.

---

#### Module 11.2 — CI/CD Pipeline
**What it builds:** GitHub Actions workflow + Dependabot config.
**Files to create:**
- `.github/workflows/ci.yml`
- `.github/workflows/sentry-release.yml`
- `.github/dependabot.yml`

**Dependencies:** Module 0.1.

---

### Phase 12 — Search & Filtering (depends on Phase 4)

#### Module 12.1 — Full-Text Search & Filters
**What it builds:** Debounced search and multi-faceted filter panel.
**Files to create:**
- `src/hooks/useDebounce.ts`
- `src/components/search/FilterPanel.tsx` — tags, indoor/outdoor toggles, is_free toggle, neighborhood select

**Files to modify:**
- `src/app/(public)/places/page.tsx` — wire up FilterPanel + FTS query
- `src/app/(public)/events/page.tsx` — wire up FilterPanel + FTS query
- `src/app/(public)/explore/page.tsx` — wire up MapFilterPanel

**SQL to add (new migration if not in 00001):**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Dependencies:** Module 4.1, Module 4.2.

---

## 17. File Relationship Map

### Critical Import Rules

```
src/lib/supabase/admin.ts
  → ONLY imported by: src/actions/organizer-requests.ts (for role update)
  → NEVER imported by: any file in src/components/ or src/app/(public)/

src/lib/supabase/database.types.ts
  → Auto-generated — DO NOT edit manually
  → Imported by: src/types/index.ts, all files needing DB row types

src/lib/validations/*.ts (Zod schemas)
  → Imported by: corresponding form components (for zodResolver)
  → Imported by: corresponding Server Actions (for server-side validation)
  → Same schema used in both places — do not duplicate

src/actions/*.ts
  → Imported by: 'use client' form components that call Server Actions
  → Import chain: action → lib/supabase/server.ts → lib/validations/*.ts → lib/email/client.ts

src/lib/email/client.ts
  → ONLY imported by: src/actions/*.ts
  → NEVER imported by: any component or page
```

### Data Flow Summary

```
Browser request
  → middleware.ts (session refresh)
  → Server Component page (direct Supabase query via lib/supabase/server.ts)
  → Renders HTML with data

User form submission
  → Client Component form (react-hook-form + Zod)
  → Server Action (re-validates + DB write + optional email)
  → Returns { data, error }
  → Client shows toast

Image upload
  → Client component → POST /api/upload/event-image
  → Route handler (auth check + MIME check + sharp processing + Storage upload)
  → Returns { path }
  → Path stored in form state
  → Path saved to events table on form submit
```

### Schema Change Propagation

When a DB schema change is made, these files must be updated in order:
1. New migration SQL file
2. `supabase gen types` → update `database.types.ts`
3. Update affected `src/lib/validations/*.ts`
4. Update affected `src/actions/*.ts`
5. Update affected components if new fields need to be displayed/inputted
6. Run `npx tsc --noEmit` to verify

---

## 18. Open Decisions

These items are **intentionally deferred**. AI agents MUST NOT implement these without explicit instruction and updated documentation from the project owner.

| # | Topic | Context | Impact on Code |
|---|---|---|---|
| OD-01 | Initial taxonomy tags | What categories and themes should be seeded? | `supabase/migrations/00005_seed_tags.sql` |
| OD-02 | Event recurrence | Should recurring events be supported in MVP? Would require an `event_recurrence` table and UI | Schema, EventForm, events query logic |
| OD-03 | Organizer verification | Should organizer requests require additional verification (e.g., social media link, website)? | `organizer_requests` table schema, OrganizerRequestForm |
| OD-04 | Pagination strategy | Cursor-based, offset, or infinite scroll? | All list pages + places/events actions |
| OD-05 | Rate limiting strategy | Upstash Redis? Vercel Edge built-in? None for MVP? | `middleware.ts`, `/api/upload/event-image/route.ts` |
| OD-06 | Analytics provider | Vercel Analytics, Plausible, or none? | `src/app/layout.tsx` |
| OD-07 | Map default configuration | Initial zoom level and center coordinates for Seattle (suggested: lat 47.6062, lng -122.3321, zoom 12) | `src/lib/mapbox.ts` |

---

## 19. Maintenance Guide

### After any database schema change
1. Create a new migration file: `supabase/migrations/NNNNN_description.sql` (increment N)
2. Run locally: `supabase db push`
3. Regenerate types: `supabase gen types --lang=typescript --local > src/lib/supabase/database.types.ts`
4. Update affected Zod schemas in `src/lib/validations/`
5. Update affected Server Actions in `src/actions/`
6. Verify: `npx tsc --noEmit`
7. Deploy to production: `supabase db push` with production DB URL
8. Update this README (Section 6) if the schema section changes

### After adding a new route
1. Add to Section 11 of this README
2. If protected: verify role guard in the parent `layout.tsx`
3. If it uses a new Server Action: add to Section 12
4. If it introduces new form fields: update the corresponding Zod schema and this README

### After adding new environment variables
1. Add to `.env.local.example` with a placeholder value
2. Add to Section 5 of this README with description and [SERVER] marker if applicable
3. Add to all Vercel environments (development, preview, production) via the Vercel dashboard
4. Verify `next.config.ts` env validation if the variable is required

### Updating shadcn/ui components
```bash
# Add a new component
npx shadcn@latest add <component-name>

# Update an existing component
npx shadcn@latest add <component-name> --overwrite

# Never manually edit files in src/components/ui/
```

### Updating Supabase generated types
```bash
# Local (after schema changes)
supabase gen types --lang=typescript --local > src/lib/supabase/database.types.ts

# Remote production project
supabase gen types --lang=typescript --project-id <project-id> > src/lib/supabase/database.types.ts
```

### Adding a new email template
1. Create new `.tsx` file in `src/lib/email/templates/`
2. Use `@react-email/components` primitives
3. Preview with: `npx react-email dev` (serves a preview server)
4. Import and call from the appropriate Server Action
5. Add the trigger and recipient to Section 10.2 of this README

### Security audit checklist (run before any production deployment)
- [ ] `npm audit --audit-level high` passes
- [ ] All new form fields have Zod validation on both client and server
- [ ] Any new file upload handlers use `file-type` for MIME validation
- [ ] No new environment variables exposed via `NEXT_PUBLIC_` unnecessarily
- [ ] New routes requiring auth have a layout.tsx guard
- [ ] New tables have RLS enabled and all required policies
- [ ] `supabase/admin.ts` is not imported in any new client-side file
- [ ] Redirect URLs in new auth flows sanitize the `next` parameter
