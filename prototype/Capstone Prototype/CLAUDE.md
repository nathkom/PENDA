# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ThirdSpace** is a React prototype for discovering community spaces and events in Seattle neighborhoods. It is a client-side-only mockup with no backend — all data is static, authentication is non-functional, and likes are persisted via `localStorage`.

The full product specification is in `project_doc/SPEC.md`.

## Commands

All commands run from the `site/` directory:

```bash
npm run dev       # Start Vite dev server with hot reload
npm run build     # Production build → dist/
npm run preview   # Serve the built dist/ locally
npm run lint      # ESLint check
```

No test framework is configured; there are no tests.

## Architecture

### Tech Stack
- **React 19** (JSX, no TypeScript)
- **React Router v7** for client-side routing
- **Tailwind CSS v4** via Vite plugin (imported with `@import "tailwindcss"`)
- **Lucide React** for all icons
- **Vite** as the dev/build tool

### Directory Layout (`site/src/`)

```
App.jsx              # Root router — defines all routes
main.jsx             # DOM mount point

pages/               # Route-level components (one per route)
components/          # Reusable UI components
context/             # React Context (UserContext only)
data/                # Static mock data (events, neighborhoods, bulletin)
utils/               # Pure logic (filtering)
```

### Routes

| Path | Component | Description |
|---|---|---|
| `/` | `Home` | Bulletin board + filterable event feed |
| `/neighborhoods` | `Neighborhoods` | All 8 Seattle neighborhoods |
| `/events` | `Events` | Full searchable/filterable event catalog |
| `/events/:id` | `EventDetail` | Single event detail + related events |
| `/signin` | `SignIn` | Placeholder (non-functional) |

### State Management

- **`UserContext`** (`context/UserContext.jsx`): Global user state via Context API. User is `null` by default (no auth backend). Consumed via `useUser()` hook.
- **Likes**: Persisted to `localStorage` keyed by event ID. No server sync.
- **Filter state**: Local `useState` within each page component that uses filters.

### Filtering System

`utils/filters.js` is the central filtering module:
- `filterEvents(events, filters)` — applies all active filters
- Exported constants: `NEIGHBORHOODS`, `CATEGORIES`, `ACCESSIBILITY_OPTIONS`
- Filter dimensions: neighborhood (multi-select), category, date range, cost (all/free/paid), accessibility options, keyword search (matches title, description, space_name, tags)

The `Events` page also reads a `?neighborhood=id` query param on mount to pre-apply a neighborhood filter (used when navigating from the Neighborhoods page).

### Data Models

**Event** (in `data/events.js`): `id`, `title`, `space_name`, `neighborhood`, `category`, `description`, `date`, `time`, `cost`, `accessibility[]`, `tags[]`, `image_url`, `gallery_images[]`, `contact_email`, `featured`, `crowd_vibe`, `social_pressure`, `space_format`, `crowd_level`

**Neighborhood** (in `data/neighborhoods.js`): `id`, `name`, `descriptor`, `description`, `image_url`, `event_ids[]`

**Bulletin** (in `data/bulletin.js`): `month`, `headline`, `editorial_note`, `featured_items[]`

### Key Component Notes

- **`EventCard`**: Accepts a `variant` prop — `"feed"` (horizontal) or `"grid"` (vertical).
- **`FilterCard`**: Shared filter sidebar used on Home and Events pages.
- **`Home`**: Uses `useMemo` for filtered results; supports "Most Liked" sort (reads from localStorage); mobile filter drawer with backdrop.
- **`NavBar`**: Desktop uses animated sliding pill indicator for active route; mobile uses hamburger dropdown.

### Styling Conventions

- All styling is Tailwind utility classes; no custom CSS beyond the `@import "tailwindcss"` in `index.css`.
- No CSS modules or styled-components.
