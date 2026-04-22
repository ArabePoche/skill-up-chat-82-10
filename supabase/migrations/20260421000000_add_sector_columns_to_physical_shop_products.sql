-- Ajouter les colonnes sector et sector_data à la table physical_shop_products
-- Permet de classer les produits par secteur (pharmaceutique, alimentaire, habillement, etc.)
-- et de stocker des données spécifiques à chaque secteur

ALTER TABLE public.physical_shop_products
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS sector_data JSONB DEFAULT '{}';

-- Ajouter un index sur sector pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_physical_shop_products_sector ON public.physical_shop_products(sector);

-- Ajouter un commentaire sur la colonne sector
COMMENT ON COLUMN public.physical_shop_products.sector IS 'Secteur d''activité du produit (pharmaceutical, clothing, food, electronics, hardware, default)';

COMMENT ON COLUMN public.physical_shop_products.sector_data IS 'Données spécifiques au secteur sous forme JSON (dosage, taille, marque, etc.)';
