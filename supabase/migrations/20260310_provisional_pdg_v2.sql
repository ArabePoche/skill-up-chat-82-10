
-- Création robuste d'un compte provisoire pour le PDG sur TOUTES les boutiques
-- Username: admin
-- Password: admin
-- PIN: 1234

-- 1. Mise à jour des agents PDG existants qui n'ont pas encore de username
UPDATE public.shop_agents 
SET 
  username = 'admin',
  password_hash = 'admin',
  pin_code = '1234'
WHERE role = 'PDG';

-- 2. Pour chaque boutique qui n'a pas encore d'agent PDG avec username 'admin', on en crée un
INSERT INTO public.shop_agents (shop_id, first_name, last_name, role, username, password_hash, pin_code, status)
SELECT s.id, 'Admin', 'Global', 'PDG', 'admin', 'admin', '1234', 'active'
FROM public.physical_shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_agents sa 
  WHERE sa.shop_id = s.id AND sa.username = 'admin'
);

-- 3. Vérification : Afficher les comptes admin créés pour confirmer
SELECT shop_id, username, role, status FROM public.shop_agents WHERE username = 'admin';
