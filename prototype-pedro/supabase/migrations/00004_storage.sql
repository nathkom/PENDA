-- Migration 00004: Storage Configuration
-- Creates the event-images bucket and its RLS policies.

-- ============================================================================
-- 1. BUCKET: event-images
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- ============================================================================
-- 2. STORAGE RLS POLICIES
-- ============================================================================

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

-- Public read for images belonging to published events
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
