-- Ajout du champ avatar_url pour les agents de boutique
ALTER TABLE public.shop_agents
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Pas besoin d'index particulier, l'URL est rarement filtrée.
