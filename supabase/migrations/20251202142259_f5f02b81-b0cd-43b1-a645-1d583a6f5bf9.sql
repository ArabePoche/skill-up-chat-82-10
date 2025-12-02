-- Ajouter les colonnes manquantes à school_evaluations
ALTER TABLE school_evaluations 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 20,
ADD COLUMN IF NOT EXISTS coefficient NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS include_in_average BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS evaluation_date DATE;