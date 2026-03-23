-- Trigger function to update wallet balance on habbah event
CREATE OR REPLACE FUNCTION public.handle_habbah_gain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if wallet exists, if not create it
  INSERT INTO public.user_wallets (user_id, habbah, soumboulah_cash, soumboulah_bonus)
  VALUES (NEW.user_id, NEW.habbah_earned, 0, 0)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    habbah = user_wallets.habbah + NEW.habbah_earned,
    updated_at = now();
    
  RETURN NEW;
END;
$$;

-- Trigger definition
DROP TRIGGER IF EXISTS on_habbah_event_insert ON public.habbah_events;
CREATE TRIGGER on_habbah_event_insert
  AFTER INSERT ON public.habbah_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_habbah_gain();
