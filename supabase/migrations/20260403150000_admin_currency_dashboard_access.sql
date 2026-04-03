-- Appliquer des politiques pour permettre aux administrateurs de voir les données globales du système monétaire

-- Autoriser les administrateurs à voir tous les portefeuilles
DROP POLICY IF EXISTS "Admins can view all user_wallets" ON public.user_wallets;
CREATE POLICY "Admins can view all user_wallets" ON public.user_wallets
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Autoriser les administrateurs à voir toutes les transactions
DROP POLICY IF EXISTS "Admins can view all wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all wallet_transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Autoriser les administrateurs à voir les commandes marketplace
DROP POLICY IF EXISTS "Admins can view all marketplace_orders" ON public.marketplace_orders;
CREATE POLICY "Admins can view all marketplace_orders" ON public.marketplace_orders
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Autoriser les administrateurs à voir les conversions monétaires
DROP POLICY IF EXISTS "Admins can view currency_conversion" ON public.currency_conversion_settings;
CREATE POLICY "Admins can view currency_conversion" ON public.currency_conversion_settings
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
