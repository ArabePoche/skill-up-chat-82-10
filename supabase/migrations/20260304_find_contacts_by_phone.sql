-- Fonction RPC sécurisée pour la découverte de contacts
-- Prend un tableau de numéros de téléphone et retourne les profils correspondants
-- Utilise SECURITY DEFINER pour bypasser le RLS (seuls les profils correspondants sont retournés)

CREATE OR REPLACE FUNCTION public.find_contacts_by_phone(phone_numbers TEXT[])
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  phone_country_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.phone, p.phone_country_code
  FROM profiles p
  WHERE p.phone IS NOT NULL
    AND p.phone != ''
    AND p.id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM unnest(phone_numbers) AS input_phone
      WHERE
        -- 1. Cas idéal : Match exact sur (code_pays + téléphone)
        -- Ex: input="+22312345678" vs profile="12345678", code="+223"
        (COALESCE(p.phone_country_code, '') || regexp_replace(p.phone, '[^0-9]', '', 'g')) = regexp_replace(input_phone, '[^0-9+]', '', 'g')
        
        -- 2. Cas local : Match exact sur téléphone seul (sans code pays)
        -- Si l'utilisateur a enregistré "12345678" dans ses contacts
        OR regexp_replace(p.phone, '[^0-9]', '', 'g') = regexp_replace(input_phone, '[^0-9]', '', 'g')

        -- 3. Cas souple : Si le numéro input contient le téléphone du profil (avec ou sans zéro)
        -- Permet de matcher "012345678" avec "12345678"
        OR regexp_replace(input_phone, '[^0-9]', '', 'g') LIKE '%' || regexp_replace(p.phone, '[^0-9]', '', 'g')
        
        -- 4. Cas inverse : Si le téléphone complet (code+num) du profil contient le numéro input
        -- Ex: profile="+223 70 12 34 56", input="70123456"
        OR (COALESCE(p.phone_country_code, '') || regexp_replace(p.phone, '[^0-9]', '', 'g')) LIKE '%' || regexp_replace(input_phone, '[^0-9]', '', 'g')
    );
END;
$$;
