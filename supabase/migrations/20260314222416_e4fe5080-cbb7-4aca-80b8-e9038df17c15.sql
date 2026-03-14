
-- Add requested_role column to shop_agents for pending requests
ALTER TABLE public.shop_agents 
  ADD COLUMN IF NOT EXISTS requested_role text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email text;

-- Set default status to 'pending' is already handled by existing column
-- Update status default to 'pending' for new agent requests
COMMENT ON COLUMN public.shop_agents.requested_role IS 'Role requested by the user, set by owner on approval';
COMMENT ON COLUMN public.shop_agents.status IS 'pending = awaiting approval, active = approved, inactive = deactivated';
