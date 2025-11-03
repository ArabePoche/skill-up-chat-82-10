-- Add missing INSERT policies on public.videos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'Admins can create videos'
  ) THEN
    CREATE POLICY "Admins can create videos"
    ON public.videos
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'Users can create own videos'
  ) THEN
    CREATE POLICY "Users can create own videos"
    ON public.videos
    FOR INSERT
    WITH CHECK (author_id = auth.uid());
  END IF;
END
$$;