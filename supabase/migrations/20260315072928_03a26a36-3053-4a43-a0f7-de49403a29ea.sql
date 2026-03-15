-- Permettre aux agents de voir les boutiques auxquelles ils sont rattachés
DROP POLICY IF EXISTS "Users can view their own shops" ON public.physical_shops;

CREATE POLICY "Users can view their own or agent shops"
ON public.physical_shops FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR id IN (SELECT get_agent_shop_ids(auth.uid()))
);