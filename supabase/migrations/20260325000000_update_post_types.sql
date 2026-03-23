-- Migration to update the allowed post types in the check constraint to include new categories
ALTER TABLE "public"."posts" DROP CONSTRAINT IF EXISTS "posts_post_type_check";

ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_post_type_check" 
  CHECK (post_type IN ('recruitment', 'info', 'annonce', 'formation', 'religion', 'general'));
