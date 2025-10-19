-- Add missing UPDATE policies on public.videos so edits actually apply
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'Admins can update videos'
  ) THEN
    CREATE POLICY "Admins can update videos"
    ON public.videos
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'Authors can update own videos'
  ) THEN
    CREATE POLICY "Authors can update own videos"
    ON public.videos
    FOR UPDATE
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());
  END IF;
END
$$;