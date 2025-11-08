-- Créer la table services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER, -- en minutes
  category_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Créer la table pour les fichiers des services
CREATE TABLE IF NOT EXISTS public.service_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'document'
  file_name TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_service_files_service_id ON public.service_files(service_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_services_updated_at_trigger
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION update_services_updated_at();

-- RLS pour services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les services sont visibles par tous"
ON public.services FOR SELECT
USING (is_active = true OR auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Les utilisateurs vérifiés peuvent créer des services"
ON public.services FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_verified = true
  )
);

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres services"
ON public.services FOR UPDATE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres services"
ON public.services FOR DELETE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- RLS pour service_files
ALTER TABLE public.service_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les fichiers de services sont visibles par tous"
ON public.service_files FOR SELECT
USING (EXISTS (
  SELECT 1 FROM services WHERE id = service_id AND (is_active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
));

CREATE POLICY "Les propriétaires de services peuvent ajouter des fichiers"
ON public.service_files FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM services WHERE id = service_id AND user_id = auth.uid()
));

CREATE POLICY "Les propriétaires de services peuvent supprimer leurs fichiers"
ON public.service_files FOR DELETE
USING (EXISTS (
  SELECT 1 FROM services WHERE id = service_id AND user_id = auth.uid()
));

-- Créer le bucket pour les fichiers de services
INSERT INTO storage.buckets (id, name, public)
VALUES ('service_files', 'service_files', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket service_files
CREATE POLICY "Les fichiers de services sont accessibles publiquement"
ON storage.objects FOR SELECT
USING (bucket_id = 'service_files');

CREATE POLICY "Les utilisateurs vérifiés peuvent uploader des fichiers de services"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service_files' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_verified = true
  )
);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres fichiers de services"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs fichiers de services"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service_files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);