
DROP POLICY IF EXISTS "solidarity_campaign_media_select" ON public.solidarity_campaign_media;
CREATE POLICY "solidarity_campaign_media_select" ON public.solidarity_campaign_media
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM solidarity_campaigns c
      WHERE c.id = solidarity_campaign_media.campaign_id
        AND (c.status IN ('approved', 'completed') OR c.creator_id = auth.uid())
    )
  );
