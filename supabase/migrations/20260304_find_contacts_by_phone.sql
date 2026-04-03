-- Fonction RPC sÃ©curisÃ©e pour la dÃ©couverte de contacts
-- Prend un tableau de numÃ©ros de tÃ©lÃ©phone et retourne les profils correspondants
-- Utilise SECURITY DEFINER pour bypasser le RLS (seuls les profils correspondants sont retournÃ©s)

CREATE OR REPLACE FUNCTION public.find_contacts_by_phone(phone_numbers TEXT[])
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  phone_country_code TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.phone, p.phone_country_code, p.avatar_url
  FROM profiles p
  WHERE p.phone IS NOT NULL
    AND p.phone != ''
    AND p.id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM unnest(phone_numbers) AS input_phone
      WHERE
        -- 1. Cas idÃ©al : Match exact sur (code_pays + tÃ©lÃ©phone)
        -- Ex: input="+22312345678" vs profile="12345678", code="+223"
        (COALESCE(p.phone_country_code, '') || regexp_replace(p.phone, '[^0-9]', '', 'g')) = regexp_replace(input_phone, '[^0-9+]', '', 'g')
        
        -- 2. Cas local : Match exact sur tÃ©lÃ©phone seul (sans code pays)
        -- Si l'utilisateur a enregistrÃ© "12345678" dans ses contacts
        OR regexp_replace(p.phone, '[^0-9]', '', 'g') = regexp_replace(input_phone, '[^0-9]', '', 'g')

        -- 3. Cas souple : Si le numÃ©ro input contient le tÃ©lÃ©phone du profil (avec ou sans zÃ©ro)
        -- Permet de matcher "012345678" avec "12345678"
        OR regexp_replace(input_phone, '[^0-9]', '', 'g') LIKE '%' || regexp_replace(p.phone, '[^0-9]', '', 'g')
        
        -- 4. Cas inverse : Si le tÃ©lÃ©phone complet (code+num) du profil contient le numÃ©ro input
        -- Ex: profile="+223 70 12 34 56", input="70123456"
        OR (COALESCE(p.phone_country_code, '') || regexp_replace(p.phone, '[^0-9]', '', 'g')) LIKE '%' || regexp_replace(input_phone, '[^0-9]', '', 'g')
    );
END;
$$;

