ALTER TABLE currency_conversion_settings 
ADD COLUMN IF NOT EXISTS sc_to_fcfa_rate numeric NOT NULL DEFAULT 1;