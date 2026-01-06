-- Permettre à tout le monde (connecté ou non) de voir les likes des vidéos
CREATE POLICY "Anyone can view video likes" 
ON public.video_likes 
FOR SELECT 
TO anon
USING (true);