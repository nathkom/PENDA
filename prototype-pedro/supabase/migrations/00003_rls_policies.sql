-- Migration 00003: Row-Level Security Policies
-- Enables RLS on all tables and creates all access policies.

-- ============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE places             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue   ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. profiles
-- ============================================================================

CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- 3. organizer_requests
-- ============================================================================

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

-- ============================================================================
-- 4. places
-- ============================================================================

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

-- ============================================================================
-- 5. events
-- ============================================================================

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

-- ============================================================================
-- 6. tags
-- ============================================================================

CREATE POLICY "tags_select_all"   ON tags FOR SELECT USING (true);
CREATE POLICY "tags_insert_admin" ON tags FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "tags_update_admin" ON tags FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "tags_delete_admin" ON tags FOR DELETE USING (get_my_role() = 'admin');

-- ============================================================================
-- 7. place_tags
-- ============================================================================

CREATE POLICY "place_tags_select_all"
  ON place_tags FOR SELECT USING (true);

CREATE POLICY "place_tags_write_organizer"
  ON place_tags FOR ALL
  WITH CHECK (get_my_role() IN ('organizer', 'admin'));

-- ============================================================================
-- 8. event_tags
-- ============================================================================

CREATE POLICY "event_tags_select_all"
  ON event_tags FOR SELECT USING (true);

CREATE POLICY "event_tags_write_organizer"
  ON event_tags FOR ALL
  WITH CHECK (get_my_role() IN ('organizer', 'admin'));

-- ============================================================================
-- 9. reviews
-- ============================================================================

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

-- ============================================================================
-- 10. reports
-- ============================================================================

CREATE POLICY "reports_insert_authenticated"
  ON reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = reporter_id);

CREATE POLICY "reports_select_own"
  ON reports FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "reports_select_admin"
  ON reports FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "reports_update_admin"
  ON reports FOR UPDATE USING (get_my_role() = 'admin');

-- ============================================================================
-- 11. moderation_queue
-- ============================================================================

CREATE POLICY "moderation_queue_insert_organizer"
  ON moderation_queue FOR INSERT
  WITH CHECK (get_my_role() IN ('organizer', 'admin') AND auth.uid() = submitted_by);

CREATE POLICY "moderation_queue_select_own"
  ON moderation_queue FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "moderation_queue_select_admin"
  ON moderation_queue FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "moderation_queue_update_admin"
  ON moderation_queue FOR UPDATE USING (get_my_role() = 'admin');
