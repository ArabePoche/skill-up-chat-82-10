
-- Ajout des champs d'authentification pour les agents
ALTER TABLE public.shop_agents 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS password_hash text;

-- Index pour la recherche rapide par username dans une boutique
CREATE INDEX IF NOT EXISTS idx_shop_agents_username ON public.shop_agents(shop_id, username);

-- Mise à jour des PDG existants avec un username par défaut (leur email si possible)
UPDATE public.shop_agents sa
SET username = p.email
FROM public.profiles p
WHERE sa.user_id = p.id AND sa.username IS NULL;

-- Note: Le mot de passe devra être défini par l'utilisateur lors de sa première connexion 
-- ou par le propriétaire lors de la création.
