-- Ajouter les colonnes manquantes pour la formation en groupe
ALTER TABLE formation_pricing_options 
ADD COLUMN IF NOT EXISTS enable_group_training boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_students_per_promotion integer,
ADD COLUMN IF NOT EXISTS auto_create_promotions boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS promotion_naming_pattern text DEFAULT 'formation_number',
ADD COLUMN IF NOT EXISTS custom_naming_pattern text;
