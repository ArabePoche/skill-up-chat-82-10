
-- Créer le bucket pour les vidéos du flux TikTok / Accueil
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tiktok_feed_media', 'tiktok_feed_media', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux utilisateurs authentifiés d'uploader des vidéos
CREATE POLICY "Users can upload tiktok feed videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'tiktok_feed_media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre la lecture publique des vidéos
CREATE POLICY "Public can view tiktok feed videos" ON storage.objects
FOR SELECT USING (bucket_id = 'tiktok_feed_media');

-- Politique pour permettre aux utilisateurs de supprimer leurs propres vidéos
CREATE POLICY "Users can delete their own tiktok feed videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'tiktok_feed_media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
