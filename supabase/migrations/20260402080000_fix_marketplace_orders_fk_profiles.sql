-- Fix marketplace_orders foreign keys to reference public.profiles instead of auth.users
-- This enables PostgREST to resolve buyer/seller profile joins in the API queries.

ALTER TABLE public.marketplace_orders
  DROP CONSTRAINT marketplace_orders_buyer_id_fkey,
  DROP CONSTRAINT marketplace_orders_seller_id_fkey;

ALTER TABLE public.marketplace_orders
  ADD CONSTRAINT marketplace_orders_buyer_id_fkey
    FOREIGN KEY (buyer_id) REFERENCES public.profiles(id),
  ADD CONSTRAINT marketplace_orders_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES public.profiles(id);
