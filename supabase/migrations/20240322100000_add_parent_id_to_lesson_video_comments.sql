-- Add parent_id to lesson_video_comments for nested replies
ALTER TABLE public.lesson_video_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.lesson_video_comments(id) ON DELETE CASCADE;

-- Create index for faster lookup of replies
CREATE INDEX IF NOT EXISTS idx_lesson_video_comments_parent_id ON public.lesson_video_comments(parent_id);
