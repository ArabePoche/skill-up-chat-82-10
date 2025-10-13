-- Ajouter les nouvelles colonnes à la table products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS characteristics TEXT,
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('new', 'used')),
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT false;

-- Créer une table pour gérer les images des produits (comme post_media)
CREATE TABLE IF NOT EXISTS public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media(product_id);

-- RLS policies pour product_media
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout faire
CREATE POLICY "Admins can manage product media"
ON public.product_media
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Tout le monde peut voir les médias des produits actifs
CREATE POLICY "Public can view product media"
ON public.product_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE id = product_media.product_id AND is_active = true
  )
);

-- Créer un bucket storage pour les images de produits si nécessaire
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket product-images
CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
); 