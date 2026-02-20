-- Migration 00001: Initial Schema
-- Creates all enums, tables, constraints, and indexes for the Seattle Third Spaces application.

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE app_role AS ENUM ('member', 'organizer', 'admin');

CREATE TYPE content_status AS ENUM ('draft', 'pending', 'published', 'hidden', 'rejected');

CREATE TYPE report_reason AS ENUM ('spam', 'duplicate', 'incorrect_info', 'inappropriate', 'other');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- profiles: Extended user record, auto-created by trigger on auth.users insert.
CREATE TABLE profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  role         app_role    NOT NULL DEFAULT 'member',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- organizer_requests: Tracks member-to-organizer role promotion requests.
CREATE TABLE organizer_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message     text,
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

-- places: Physical locations open to the public.
CREATE TABLE places (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text             NOT NULL,
  description    text,
  address        text             NOT NULL,
  neighborhood   text,
  zip            text,
  lat            double precision NOT NULL,
  lng            double precision NOT NULL,
  indoors        boolean          NOT NULL DEFAULT false,
  outdoors       boolean          NOT NULL DEFAULT false,
  is_free        boolean,
  accessibility  jsonb            NOT NULL DEFAULT '{}',
  status         content_status   NOT NULL DEFAULT 'draft',
  created_by     uuid             NOT NULL REFERENCES profiles(id),
  created_at     timestamptz      NOT NULL DEFAULT now(),
  updated_at     timestamptz      NOT NULL DEFAULT now(),
  dedupe_key     text             UNIQUE
);

-- events: Time-bound happenings anchored to a Place.
CREATE TABLE events (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id            uuid           NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
  title               text           NOT NULL,
  description         text,
  starts_at           timestamptz    NOT NULL,
  ends_at             timestamptz,
  is_free             boolean,
  indoors             boolean        NOT NULL DEFAULT false,
  outdoors            boolean        NOT NULL DEFAULT false,
  primary_image_path  text,
  status              content_status NOT NULL DEFAULT 'draft',
  created_by          uuid           NOT NULL REFERENCES profiles(id),
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now(),
  dedupe_key          text           UNIQUE,
  CONSTRAINT ends_after_starts CHECK (ends_at IS NULL OR ends_at > starts_at)
);

-- tags: Taxonomy labels for places and events.
CREATE TABLE tags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  kind       text        NOT NULL CHECK (kind IN ('theme', 'category')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- place_tags: Join table linking places to tags.
CREATE TABLE place_tags (
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (place_id, tag_id)
);

-- event_tags: Join table linking events to tags.
CREATE TABLE event_tags (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

-- reviews: Polymorphic reviews targeting either a Place OR an Event.
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

  CONSTRAINT review_single_target CHECK (
    (target_type = 'place' AND place_id IS NOT NULL AND event_id IS NULL) OR
    (target_type = 'event' AND event_id IS NOT NULL AND place_id IS NULL)
  )
);

-- One review per user per place (partial unique index)
CREATE UNIQUE INDEX reviews_one_per_user_place
  ON reviews(user_id, place_id)
  WHERE place_id IS NOT NULL;

-- One review per user per event (partial unique index)
CREATE UNIQUE INDEX reviews_one_per_user_event
  ON reviews(user_id, event_id)
  WHERE event_id IS NOT NULL;

-- reports: Moderation tickets submitted by any authenticated user.
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

-- moderation_queue: Tracks submission/edit requests awaiting admin review.
CREATE TABLE moderation_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type    text        NOT NULL CHECK (item_type IN ('place', 'event')),
  item_id      uuid        NOT NULL,
  submitted_by uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action       text        NOT NULL CHECK (action IN ('create', 'edit')),
  note         text,
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  uuid        REFERENCES profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Places
CREATE INDEX places_status_idx       ON places(status);
CREATE INDEX places_neighborhood_idx ON places(neighborhood);
CREATE INDEX places_zip_idx          ON places(zip);
CREATE INDEX places_location_idx     ON places(lat, lng);
CREATE INDEX places_created_by_idx   ON places(created_by);
CREATE INDEX places_created_at_idx   ON places(created_at DESC);

-- Places full-text search
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

-- Events full-text search
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
