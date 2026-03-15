-- Allow agents to update their own record (for account setup: username, password, pin)
CREATE POLICY "Agents can update their own record"
ON public.shop_agents
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
