-- Amélioration de la fonction de recherche de contacts
-- Utilise une normalisation plus robuste des numéros de téléphone

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
        -- Comparaison normalisée (chiffres uniquement)
        -- On compare les 9 derniers chiffres pour maximiser les chances de match
        -- (gère les différences +33/06, les espaces, tirets, etc)
        RIGHT(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), 9) = RIGHT(REGEXP_REPLACE(input_phone, '[^0-9]', '', 'g'), 9)
    );
END;
$$;