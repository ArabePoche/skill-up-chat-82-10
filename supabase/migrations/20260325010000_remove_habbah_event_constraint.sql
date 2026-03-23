-- Remove the restrictive check constraint on habbah_events event_type
-- This allows adding new event types (like post_create, post_like, post_comment) without modifying the schema every time.
ALTER TABLE "public"."habbah_events" DROP CONSTRAINT IF EXISTS "habbah_events_event_type_check";
