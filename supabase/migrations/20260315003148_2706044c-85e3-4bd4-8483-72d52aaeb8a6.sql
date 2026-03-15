-- Ajouter shop_id aux posts pour lier les posts de recrutement à une boutique
ALTER TABLE public.posts ADD COLUMN shop_id uuid REFERENCES public.physical_shops(id) ON DELETE SET NULL;

-- Index pour les requêtes filtrées par boutique
CREATE INDEX idx_posts_shop_id ON public.posts(shop_id) WHERE shop_id IS NOT NULL;