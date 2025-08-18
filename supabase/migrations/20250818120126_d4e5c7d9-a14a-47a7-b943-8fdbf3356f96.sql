
-- Modifier la contrainte pour inclure le plan "groupe"
ALTER TABLE formation_pricing_options 
DROP CONSTRAINT IF EXISTS formation_pricing_options_plan_type_check;

-- Recréer la contrainte avec le plan "groupe" inclus
ALTER TABLE formation_pricing_options 
ADD CONSTRAINT formation_pricing_options_plan_type_check 
CHECK (plan_type IN ('free', 'standard', 'premium', 'groupe'));