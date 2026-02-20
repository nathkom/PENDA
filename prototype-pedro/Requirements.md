# Seattle Third Spaces Web App — Working Spec (Living Document)
---

Below are the requirements this prototype was based on.

## 0) Current decisions (Locked)

### Project scope

* **Region:** Seattle Metropolitan Area
* **Definition (Third Space):** A space open to the public that can reasonably accommodate groups (e.g., cafés, bars, public parks). Excludes private residences unless explicitly public, private businesses not open to the public, and government buildings without accessible public areas.
* **Content types:** Places + Events
* **Goal:** Discovery + planning + community building
* **Primary problem (from research):** Information about third spaces and community events is fragmented across social media, flyers, and informal networks, making discovery difficult and reducing participation.

### Users

* Visitors (no account required) — browse and discover
* Organizers — create/manage places and events
* Members — review/comment and interact
* Admin/Moderator — approve and manage content

### Content sourcing (MVP)

* Manual curation (admin)
* Organizer submissions
* External APIs postponed to later phase (data enrichment only)

### Data freshness

* **Best effort** accuracy
* Transparency via "last updated" timestamps

### Discovery UX

* List/feed-first homepage
* Dedicated **Explore** page with map view

### Reviews

* Rating + text reviews

### Media

* Events require a primary image uploaded by organizer
* **Strict MVP image model (selected):** primary image only; auto-resize/compress; enforce max file size; optional quotas
* Attendee uploads desirable but deferred to V1 (feature flag)
* Row Level Security for organizer/admin permissions

### 4.3 Maps (MVP)

* **Provider:** Mapbox (selected)
* Homepage: list-first
* Explore page: interactive map view with clustering
* Detail pages: small map snippet

**Usage note:** For a web app, billing is primarily by **map loads** (each time the map is initialized), not by visitor “users”. Team/editor access uses separate “seats” (account members).

### 4.4 Search

* Initial: Postgres indexed filtering + text search
* Upgrade path: Typesense or Meilisearch

---

## 5) Deployment requirements (Minimum to go live)

* Vercel hosting (frontend)
* Supabase project (DB/Auth/Storage)
* SSL enabled
* Environment secrets configured
* CI/CD from GitHub
* Error tracking (Sentry or equivalent)
* Basic analytics (optional)
* Automated backups

---

## 6) Alignment with research (from Miro board)

The research and problem framing emphasize:

* Fragmented discovery of community activities
* Need for centralized, searchable information
* Visibility improvements increasing participation
* Importance of distance, cost, safety, and clarity in decision-making

These insights directly inform:

* Strong filtering system
* Location-based discovery
* Clear metadata on events and places
* Trust signals (reviews, moderation, organizer ownership)

---

## 7) Roadmap buckets (Draft)

### MVP

* Browse/search/filter
* List-first feed
* Explore map page
* Organizer accounts
* Create place/event
* Moderation queue
* Reviews (rating + text)
* Primary images
* Basic admin tools

### V1

* Saved lists/bookmarks
* Attendee photo uploads (compressed)
* Improved search ranking
* Organizer edit history

### V2

* Itinerary planning
* Calendar integration
* Recommendations
* Organizer analytics

---

## 8) Open decisions (Next)

1. Organizer verification rules (if any)
2. Event recurrence support for MVP vs V1
3. Initial taxonomy structure (themes/categories)

---

## 9) MVP Supabase schema (tables + indexes)

> Goal: clean relational core that supports dedupe, moderation, reviews, and map/list discovery.

### 9.1 Enums

* `app_role`: `member | organizer | admin`
* `content_status`: `draft | pending | published | hidden | rejected`
* `report_reason`: `spam | duplicate | incorrect_info | inappropriate | other`

### 9.2 Tables (MVP)

**profiles** (ties auth users to app roles)

* `id uuid pk` (matches `auth.users.id`)
* `display_name text`
* `role app_role default 'member'`
* `created_at timestamptz`

**places**

* `id uuid pk`
* `name text not null`
* `description text`
* `address text`
* `neighborhood text`
* `zip text`
* `lat double precision` / `lng double precision`
* `indoors boolean` / `outdoors boolean`
* `is_free boolean`
* `accessibility jsonb` (optional flags)
* `status content_status default 'draft'`
* `created_by uuid fk -> profiles(id)`
* `created_at/updated_at timestamptz`
* `dedupe_key text unique` (optional; normalized name+address)

**events**

* `id uuid pk`
* `place_id uuid fk -> places(id)`
* `title text not null`
* `description text`
* `starts_at timestamptz not null`
* `ends_at timestamptz`
* `is_free boolean`
* `indoors boolean` / `outdoors boolean`
* `primary_image_path text` (Supabase Storage path)
* `status content_status default 'draft'`
* `created_by uuid fk -> profiles(id)`
* `created_at/updated_at timestamptz`
* `dedupe_key text unique` (optional; normalized title+starts_at+place)

**tags**

* `id uuid pk`
* `name text unique not null`
* `kind text not null` (e.g., `theme` or `category`)

**place_tags**

* `place_id uuid fk -> places(id)`
* `tag_id uuid fk -> tags(id)`
* pk `(place_id, tag_id)`

**event_tags**

* `event_id uuid fk -> events(id)`
* `tag_id uuid fk -> tags(id)`
* pk `(event_id, tag_id)`

**reviews** (rating + text for places OR events)

* `id uuid pk`
* `target_type text check (target_type in ('place','event'))`
* `place_id uuid nullable fk -> places(id)`
* `event_id uuid nullable fk -> events(id)`
* `user_id uuid fk -> profiles(id)`
* `rating int check (rating between 1 and 5)`
* `body text`
* `status content_status default 'published'` (allow hiding)
* `created_at timestamptz`

**reports** (moderation tickets)

* `id uuid pk`
* `reporter_id uuid fk -> profiles(id)`
* `target_type text check (target_type in ('place','event','review'))`
* `place_id uuid nullable`
* `event_id uuid nullable`
* `review_id uuid nullable`
* `reason report_reason`
* `details text`
* `status text default 'open'` (open/triaged/closed)
* `created_at timestamptz`

**moderation_queue** (submission/change requests)

* `id uuid pk`
* `item_type text check (item_type in ('place','event'))`
* `item_id uuid not null`
* `submitted_by uuid fk -> profiles(id)`
* `action text` (create/edit)
* `note text`
* `status text default 'pending'` (pending/approved/rejected)
* `reviewed_by uuid nullable`
* `reviewed_at timestamptz nullable`
* `created_at timestamptz`

### 9.3 Indexes (minimum)

* `places(status)`, `places(zip)`, `places(neighborhood)`
* `events(status)`, `events(starts_at)`, `events(place_id)`
* `tags(name)`
* trigram or FTS indexes later for better search

---

## 10) MVP RLS model (high level)

### 10.1 Public read rules

* Anyone can `SELECT` **published** places/events/reviews.

### 10.2 Write rules

* Only authenticated users can create content.
* Organizers can `INSERT/UPDATE` their own places/events while `status in (draft,pending)`.
* Only admins can publish/hide/reject any content.

### 10.3 Moderation

* Reports: any authenticated user can create.
* Moderation queue: organizers can create entries for their submissions; admins can review.

### 10.4 Storage policy (events primary images)

* Storage bucket `event-images`
* Only authenticated organizers/admins can upload.
* Public can read only for published events.

---

## 11) Next.js route structure (App Router)

### Public

* `/` — list-first feed (places/events)
* `/explore` — map view + filter panel
* `/places` — browse places
* `/places/[id]` — place details + related events
* `/events` — browse events
* `/events/[id]` — event details
* `/auth/sign-in`
* `/auth/sign-up`

### Organizer

* `/organizer` — dashboard
* `/organizer/places` — manage places
* `/organizer/places/new`
* `/organizer/places/[id]/edit`
* `/organizer/events` — manage events
* `/organizer/events/new`
* `/organizer/events/[id]/edit`

### Admin/Moderator

* `/admin` — overview
* `/admin/moderation` — queue
* `/admin/reports` — reports triage
* `/admin/tags` — manage taxonomy

### API (route handlers as needed)

* `/api/search` (optional; can be server actions instead)
* `/api/upload/event-image` (optional helper if not uploading direct to Supabase Storage)
