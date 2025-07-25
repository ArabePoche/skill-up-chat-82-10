-- Création de la table formation_pricing_options
CREATE TABLE formation_pricing_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
  plan_type TEXT CHECK (plan_type IN ('free', 'standard', 'premium')) NOT NULL,
  
  -- Prix
  price_monthly INTEGER,
  price_yearly INTEGER,
  
  -- Accès
  allow_discussion BOOLEAN DEFAULT FALSE,
  allow_exercises BOOLEAN DEFAULT FALSE,
  allow_calls BOOLEAN DEFAULT FALSE,
  
  -- Types d'appel autorisés
  call_type TEXT CHECK (call_type IN ('none', 'audio', 'video', 'both')) DEFAULT 'none',
  
  -- Jours autorisés pour appels ou réponses profs
  allowed_call_days TEXT[], -- ['monday', 'wednesday']
  allowed_response_days TEXT[], -- ['tuesday', 'thursday']
  
  -- Contrôle de l'usage
  message_limit_per_day INTEGER,
  time_limit_minutes_per_day INTEGER,
  time_limit_minutes_per_week INTEGER,
  
  -- Leçons autorisées (pour plan gratuit par exemple)
  lesson_access UUID[],
  
  -- Statut actif
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte unique pour éviter les doublons de plan par formation
  UNIQUE(formation_id, plan_type)
);

-- Enable RLS
ALTER TABLE formation_pricing_options ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les admins seulement
CREATE POLICY "Only admins can insert pricing options" 
ON formation_pricing_options 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can update pricing options" 
ON formation_pricing_options 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can delete pricing options" 
ON formation_pricing_options 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Authenticated users can read pricing options" 
ON formation_pricing_options 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Trigger pour mise à jour automatique du timestamp
CREATE TRIGGER update_formation_pricing_options_updated_at
  BEFORE UPDATE ON formation_pricing_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();