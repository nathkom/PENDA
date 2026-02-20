-- Seed Data (dev-only — NEVER run in production)
-- Inserts sample profiles, tags, places, and events for local development.
--
-- NOTE: These profiles reference auth.users rows that must already exist.
-- When using `supabase start`, you can create test users via the Auth UI at
-- http://127.0.0.1:54323 or via the Supabase client. The handle_new_user()
-- trigger will auto-create profile rows. This seed file uses fixed UUIDs so
-- you can manually insert auth.users rows with matching IDs for testing.
--
-- Alternatively, insert directly into auth.users here (the trigger will
-- create the profiles), then update the roles afterward.

-- ============================================================================
-- 1. AUTH USERS (triggers handle_new_user → creates profiles automatically)
-- ============================================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'member@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test Member"}',
    now(), now(), '', ''
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'organizer@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test Organizer"}',
    now(), now(), '', ''
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test Admin"}',
    now(), now(), '', ''
  );

-- ============================================================================
-- 2. UPDATE PROFILE ROLES (trigger sets all to 'member' by default)
-- ============================================================================

UPDATE profiles SET role = 'organizer' WHERE id = 'b2222222-2222-2222-2222-222222222222';
UPDATE profiles SET role = 'admin'     WHERE id = 'c3333333-3333-3333-3333-333333333333';

-- ============================================================================
-- 3. TAGS
-- ============================================================================

INSERT INTO tags (id, name, kind) VALUES
  ('d4444444-4444-4444-4444-444444444444', 'Coffee', 'category'),
  ('e5555555-5555-5555-5555-555555555555', 'Community', 'theme');

-- ============================================================================
-- 4. PLACES (all published, created by organizer)
-- ============================================================================

INSERT INTO places (
  id, name, description, address, neighborhood, zip,
  lat, lng, indoors, outdoors, is_free, status, created_by, dedupe_key
) VALUES
  (
    'f6666666-6666-6666-6666-666666666666',
    'Elm Coffee Roasters',
    'Specialty coffee shop in Pioneer Square with minimalist design and excellent espresso.',
    '240 2nd Ave S, Seattle, WA 98104',
    'Pioneer Square',
    '98104',
    47.6003, -122.3330,
    true, false, false,
    'published',
    'b2222222-2222-2222-2222-222222222222',
    'elm coffee roasters|240 2nd ave s, seattle, wa 98104'
  ),
  (
    'f7777777-7777-7777-7777-777777777777',
    'Cal Anderson Park',
    'Popular Capitol Hill park with sports fields, wading pool, and open green spaces.',
    '1635 11th Ave, Seattle, WA 98122',
    'Capitol Hill',
    '98122',
    47.6173, -122.3195,
    false, true, true,
    'published',
    'b2222222-2222-2222-2222-222222222222',
    'cal anderson park|1635 11th ave, seattle, wa 98122'
  ),
  (
    'f8888888-8888-8888-8888-888888888888',
    'Ada''s Technical Books & Cafe',
    'Cozy bookstore and cafe focused on STEM topics, with a great reading atmosphere.',
    '425 15th Ave E, Seattle, WA 98112',
    'Capitol Hill',
    '98112',
    47.6226, -122.3126,
    true, false, false,
    'published',
    'b2222222-2222-2222-2222-222222222222',
    'ada''s technical books & cafe|425 15th ave e, seattle, wa 98112'
  );

-- ============================================================================
-- 5. PLACE TAGS
-- ============================================================================

INSERT INTO place_tags (place_id, tag_id) VALUES
  ('f6666666-6666-6666-6666-666666666666', 'd4444444-4444-4444-4444-444444444444'),
  ('f7777777-7777-7777-7777-777777777777', 'e5555555-5555-5555-5555-555555555555'),
  ('f8888888-8888-8888-8888-888888888888', 'd4444444-4444-4444-4444-444444444444'),
  ('f8888888-8888-8888-8888-888888888888', 'e5555555-5555-5555-5555-555555555555');

-- ============================================================================
-- 6. EVENTS (published, linked to places, created by organizer)
-- ============================================================================

INSERT INTO events (
  id, place_id, title, description, starts_at, ends_at,
  is_free, indoors, outdoors, status, created_by, dedupe_key
) VALUES
  (
    'a9999999-9999-9999-9999-999999999999',
    'f6666666-6666-6666-6666-666666666666',
    'Latte Art Throwdown',
    'Watch local baristas compete in a friendly latte art competition. Free to spectate!',
    now() + interval '7 days',
    now() + interval '7 days' + interval '2 hours',
    true, true, false,
    'published',
    'b2222222-2222-2222-2222-222222222222',
    'latte art throwdown|' || (now() + interval '7 days')::text || '|f6666666-6666-6666-6666-666666666666'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'f7777777-7777-7777-7777-777777777777',
    'Community Yoga in the Park',
    'Free outdoor yoga session open to all skill levels. Bring your own mat!',
    now() + interval '3 days',
    now() + interval '3 days' + interval '1 hour',
    true, false, true,
    'published',
    'b2222222-2222-2222-2222-222222222222',
    'community yoga in the park|' || (now() + interval '3 days')::text || '|f7777777-7777-7777-7777-777777777777'
  );

-- ============================================================================
-- 7. EVENT TAGS
-- ============================================================================

INSERT INTO event_tags (event_id, tag_id) VALUES
  ('a9999999-9999-9999-9999-999999999999', 'd4444444-4444-4444-4444-444444444444'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e5555555-5555-5555-5555-555555555555');
