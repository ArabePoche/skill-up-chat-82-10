-- Rendre la table des paramètres de conversion accessible publiquement en lecture
-- Indispensable pour que les visiteurs (non connectés) voient le même prix (taux) que les connectés dans la boutique

DROP POLICY IF EXISTS "Authenticated can read conversion settings" ON public.currency_conversion_settings;

CREATE POLICY "Public can read conversion settings" 
ON public.currency_conversion_settings 
FOR SELECT 
USING (true);
