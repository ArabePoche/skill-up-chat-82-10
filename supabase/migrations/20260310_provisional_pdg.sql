
-- Création d'un compte provisoire pour le PDG (Propriétaire)
-- Username: admin
-- Password: admin
-- PIN: 1234

-- On met à jour le premier agent PDG trouvé (généralement le propriétaire)
UPDATE public.shop_agents 
SET 
  username = 'admin',
  password_hash = 'admin',
  pin_code = '1234'
WHERE role = 'PDG' 
  AND (username IS NULL OR username = '');

-- Si aucun agent n'existe (peu probable avec les migrations précédentes), 
-- on s'assure qu'au moins un shop a un agent PDG admin
INSERT INTO public.shop_agents (shop_id, first_name, last_name, role, username, password_hash, pin_code)
SELECT id, 'Admin', 'Boutique', 'PDG', 'admin', 'admin', '1234'
FROM public.physical_shops
WHERE id NOT IN (SELECT shop_id FROM public.shop_agents WHERE username = 'admin')
LIMIT 1;
