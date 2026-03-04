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
        -- Match exact : country_code + phone = input
        (COALESCE(p.phone_country_code, '') || p.phone) = input_phone
        -- Match partiel : le numéro du contact se termine par le phone du profil
        OR input_phone LIKE '%' || p.phone
        -- Match partiel inverse : le phone du profil se termine par les derniers chiffres du contact
        OR p.phone LIKE '%' || RIGHT(input_phone, 9)
    );
END;
$$;
