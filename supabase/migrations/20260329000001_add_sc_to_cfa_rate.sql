ALTER TABLE public.currency_conversion_settings ADD COLUMN IF NOT EXISTS sc_to_cfa_rate numeric NOT NULL DEFAULT 10;
