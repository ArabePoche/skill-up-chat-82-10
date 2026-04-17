-- Table de configuration globale de la plateforme
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seuls les admins (service_role) peuvent modifier les settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_service_all"
  ON public.platform_settings
  USING (auth.role() = 'service_role');

-- Lecture publique (nécessaire pour que les Edge Functions anon puissent lire)
CREATE POLICY "platform_settings_public_read"
  ON public.platform_settings FOR SELECT
  USING (true);

-- URL publique du logo de la plateforme (bucket assets)
-- Remplace <PROJECT_REF> par la référence de ton projet Supabase
-- et <nom-du-fichier> par le nom exact du fichier uploadé (ex: logo.png)
INSERT INTO public.platform_settings (key, value)
VALUES (
  'platform_logo_url',
  'https://<PROJECT_REF>.supabase.co/storage/v1/object/public/assets/<nom-du-fichier>'
)
ON CONFLICT (key) DO UPDATE SET
  value      = EXCLUDED.value,
  updated_at = now();
