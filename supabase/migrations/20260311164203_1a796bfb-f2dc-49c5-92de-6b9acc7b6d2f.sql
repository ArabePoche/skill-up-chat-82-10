
-- Fix infinite recursion: create security definer function
CREATE OR REPLACE FUNCTION public.get_agent_shop_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM public.shop_agents WHERE user_id = _user_id;
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Agents can view their colleagues" ON public.shop_agents;

-- Recreate using the security definer function
CREATE POLICY "Agents can view their colleagues"
ON public.shop_agents
FOR SELECT
TO authenticated
USING (shop_id IN (SELECT public.get_agent_shop_ids(auth.uid())));
