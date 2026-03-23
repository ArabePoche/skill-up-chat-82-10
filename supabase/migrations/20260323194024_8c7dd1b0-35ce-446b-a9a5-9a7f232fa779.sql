-- Table pour les likes sur les commentaires de leçons vidéo
CREATE TABLE IF NOT EXISTS public.lesson_video_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.lesson_video_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all comment likes"
  ON public.lesson_video_comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own likes"
  ON public.lesson_video_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON public.lesson_video_comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);