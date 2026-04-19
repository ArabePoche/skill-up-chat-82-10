
-- ============================================================================
-- REFONTE SYSTÈME STICKERS : Modération, Marketplace, Monétisation, Sécurité
-- ============================================================================

-- 1. ENUM pour le statut de modération des packs
DO $$ BEGIN
  CREATE TYPE public.sticker_pack_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Évolution de sticker_packs
ALTER TABLE public.sticker_packs
  ADD COLUMN IF NOT EXISTS status public.sticker_pack_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS price_sc integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_sb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue_sc integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue_sb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icon_path text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Migration douce : packs déjà publiés -> approved
UPDATE public.sticker_packs
SET status = 'approved', reviewed_at = COALESCE(reviewed_at, now())
WHERE is_published = true AND status = 'draft';

-- 3. Évolution de stickers : ajouter chemin storage privé
ALTER TABLE public.stickers
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS preview_visible boolean NOT NULL DEFAULT false;

-- Marquer les 2 premiers stickers de chaque pack comme preview public
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY pack_id ORDER BY sort_order, created_at) AS rn
  FROM public.stickers
)
UPDATE public.stickers s
SET preview_visible = true
FROM ranked r
WHERE s.id = r.id AND r.rn <= 2;

-- 4. Table des achats / déblocages (historique + anti-doublon)
CREATE TABLE IF NOT EXISTS public.sticker_pack_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  creator_id uuid,
  price_sc integer NOT NULL DEFAULT 0,
  price_sb integer NOT NULL DEFAULT 0,
  amount_paid_sc integer NOT NULL DEFAULT 0,
  amount_paid_sb integer NOT NULL DEFAULT 0,
  creator_share_sc integer NOT NULL DEFAULT 0,
  creator_share_sb integer NOT NULL DEFAULT 0,
  platform_share_sc integer NOT NULL DEFAULT 0,
  platform_share_sb integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  transaction_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sticker_pack_purchases_unique UNIQUE (buyer_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_sticker_pack_purchases_buyer ON public.sticker_pack_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_sticker_pack_purchases_pack ON public.sticker_pack_purchases(pack_id);
CREATE INDEX IF NOT EXISTS idx_sticker_pack_purchases_creator ON public.sticker_pack_purchases(creator_id);

ALTER TABLE public.sticker_pack_purchases ENABLE ROW LEVEL SECURITY;

-- 5. Settings de commission (1 ligne configurable admin)
CREATE TABLE IF NOT EXISTS public.sticker_commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_share_percent numeric(5,2) NOT NULL DEFAULT 70.00 CHECK (creator_share_percent BETWEEN 0 AND 100),
  platform_share_percent numeric(5,2) NOT NULL DEFAULT 30.00 CHECK (platform_share_percent BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT shares_total_100 CHECK (creator_share_percent + platform_share_percent = 100)
);

INSERT INTO public.sticker_commission_settings (creator_share_percent, platform_share_percent)
SELECT 70.00, 30.00
WHERE NOT EXISTS (SELECT 1 FROM public.sticker_commission_settings);

ALTER TABLE public.sticker_commission_settings ENABLE ROW LEVEL SECURITY;

-- 6. Sync is_published <-> status (compat ascendante)
CREATE OR REPLACE FUNCTION public.sync_sticker_pack_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_published := (NEW.status = 'approved');
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_sticker_pack_published ON public.sticker_packs;
CREATE TRIGGER trg_sync_sticker_pack_published
  BEFORE INSERT OR UPDATE ON public.sticker_packs
  FOR EACH ROW EXECUTE FUNCTION public.sync_sticker_pack_published();

-- 7. Fonctions métier ----------------------------------------------------------

-- Helper : check possession pack
CREATE OR REPLACE FUNCTION public.user_owns_sticker_pack(_user_id uuid, _pack_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sticker_packs WHERE user_id = _user_id AND pack_id = _pack_id
  ) OR EXISTS (
    SELECT 1 FROM public.sticker_pack_purchases WHERE buyer_id = _user_id AND pack_id = _pack_id
  ) OR EXISTS (
    SELECT 1 FROM public.sticker_packs WHERE id = _pack_id AND creator_id = _user_id
  );
$$;

-- Soumettre un pack pour validation
CREATE OR REPLACE FUNCTION public.submit_sticker_pack_for_review(_pack_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack public.sticker_packs%ROWTYPE;
  v_count integer;
BEGIN
  SELECT * INTO v_pack FROM public.sticker_packs WHERE id = _pack_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pack introuvable'); END IF;
  IF v_pack.creator_id <> auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'Non autorisé'); END IF;
  IF v_pack.status NOT IN ('draft', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pack déjà soumis ou approuvé');
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.stickers WHERE pack_id = _pack_id;
  IF v_count = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Le pack doit contenir au moins un sticker'); END IF;

  UPDATE public.sticker_packs
  SET status = 'pending_review', submitted_at = now(), rejection_reason = NULL
  WHERE id = _pack_id;

  RETURN jsonb_build_object('success', true);
END; $$;

-- Modération admin
CREATE OR REPLACE FUNCTION public.review_sticker_pack(_pack_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status public.sticker_pack_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Réservé aux admins');
  END IF;
  IF _decision = 'approve' THEN v_new_status := 'approved';
  ELSIF _decision = 'reject' THEN v_new_status := 'rejected';
  ELSE RETURN jsonb_build_object('success', false, 'error', 'Décision invalide'); END IF;

  UPDATE public.sticker_packs
  SET status = v_new_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = CASE WHEN _decision = 'reject' THEN _reason ELSE NULL END
  WHERE id = _pack_id;

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END; $$;

-- Achat / déblocage de pack (gère gratuit + payant SC/SB)
CREATE OR REPLACE FUNCTION public.purchase_sticker_pack(
  _pack_id uuid,
  _use_sb_amount integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack public.sticker_packs%ROWTYPE;
  v_buyer uuid := auth.uid();
  v_total_price integer;
  v_pay_sb integer;
  v_pay_sc integer;
  v_wallet_sc integer;
  v_wallet_sb integer;
  v_settings public.sticker_commission_settings%ROWTYPE;
  v_creator_sc integer;
  v_creator_sb integer;
  v_platform_sc integer;
  v_platform_sb integer;
  v_purchase_id uuid;
BEGIN
  IF v_buyer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Non authentifié'); END IF;

  SELECT * INTO v_pack FROM public.sticker_packs WHERE id = _pack_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Pack introuvable'); END IF;
  IF v_pack.status <> 'approved' THEN RETURN jsonb_build_object('success', false, 'error', 'Pack non disponible'); END IF;
  IF v_pack.creator_id = v_buyer THEN RETURN jsonb_build_object('success', false, 'error', 'Vous êtes le créateur de ce pack'); END IF;

  -- Anti-doublon
  IF EXISTS (SELECT 1 FROM public.sticker_pack_purchases WHERE buyer_id = v_buyer AND pack_id = _pack_id)
     OR EXISTS (SELECT 1 FROM public.user_sticker_packs WHERE user_id = v_buyer AND pack_id = _pack_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous possédez déjà ce pack');
  END IF;

  v_total_price := COALESCE(v_pack.price_sc, 0);

  -- Cas gratuit
  IF v_total_price <= 0 THEN
    INSERT INTO public.sticker_pack_purchases(pack_id, buyer_id, creator_id, is_free)
    VALUES (_pack_id, v_buyer, v_pack.creator_id, true)
    RETURNING id INTO v_purchase_id;

    INSERT INTO public.user_sticker_packs(user_id, pack_id) VALUES (v_buyer, _pack_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.sticker_packs SET total_sales = total_sales + 1 WHERE id = _pack_id;
    RETURN jsonb_build_object('success', true, 'purchase_id', v_purchase_id, 'free', true);
  END IF;

  -- Cas payant : calcul split SC / SB
  v_pay_sb := GREATEST(0, LEAST(_use_sb_amount, v_total_price));
  v_pay_sc := v_total_price - v_pay_sb;

  -- Vérifier wallet
  SELECT COALESCE(soumboulah_cash, 0), COALESCE(soumboulah_bonus, 0)
  INTO v_wallet_sc, v_wallet_sb
  FROM public.user_wallets WHERE user_id = v_buyer;

  IF v_wallet_sc IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Portefeuille introuvable');
  END IF;
  IF v_wallet_sc < v_pay_sc OR v_wallet_sb < v_pay_sb THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solde insuffisant');
  END IF;

  -- Commission
  SELECT * INTO v_settings FROM public.sticker_commission_settings ORDER BY updated_at DESC LIMIT 1;
  v_creator_sc := FLOOR(v_pay_sc * v_settings.creator_share_percent / 100.0);
  v_creator_sb := FLOOR(v_pay_sb * v_settings.creator_share_percent / 100.0);
  v_platform_sc := v_pay_sc - v_creator_sc;
  v_platform_sb := v_pay_sb - v_creator_sb;

  -- Débit acheteur
  UPDATE public.user_wallets
  SET soumboulah_cash = soumboulah_cash - v_pay_sc,
      soumboulah_bonus = soumboulah_bonus - v_pay_sb,
      updated_at = now()
  WHERE user_id = v_buyer;

  -- Crédit créateur (uniquement la part créateur, en SC pour simplifier la liquidité)
  IF v_pack.creator_id IS NOT NULL THEN
    INSERT INTO public.user_wallets(user_id, soumboulah_cash, soumboulah_bonus)
    VALUES (v_pack.creator_id, v_creator_sc + v_creator_sb, 0)
    ON CONFLICT (user_id) DO UPDATE
      SET soumboulah_cash = public.user_wallets.soumboulah_cash + v_creator_sc + v_creator_sb,
          updated_at = now();
  END IF;

  -- Historique
  INSERT INTO public.sticker_pack_purchases(
    pack_id, buyer_id, creator_id,
    price_sc, price_sb, amount_paid_sc, amount_paid_sb,
    creator_share_sc, creator_share_sb, platform_share_sc, platform_share_sb,
    is_free
  ) VALUES (
    _pack_id, v_buyer, v_pack.creator_id,
    v_total_price, 0, v_pay_sc, v_pay_sb,
    v_creator_sc, v_creator_sb, v_platform_sc, v_platform_sb,
    false
  ) RETURNING id INTO v_purchase_id;

  INSERT INTO public.user_sticker_packs(user_id, pack_id) VALUES (v_buyer, _pack_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.sticker_packs
  SET total_sales = total_sales + 1,
      total_revenue_sc = total_revenue_sc + v_pay_sc,
      total_revenue_sb = total_revenue_sb + v_pay_sb
  WHERE id = _pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'paid_sc', v_pay_sc,
    'paid_sb', v_pay_sb
  );
END; $$;

-- 8. RLS — sticker_packs (refonte) -------------------------------------------
DROP POLICY IF EXISTS "Les packs publiés sont publics" ON public.sticker_packs;
DROP POLICY IF EXISTS "Les créateurs voient leurs packs" ON public.sticker_packs;
DROP POLICY IF EXISTS "Les créateurs peuvent ajouter des packs" ON public.sticker_packs;
DROP POLICY IF EXISTS "Les créateurs peuvent modifier leurs packs" ON public.sticker_packs;
DROP POLICY IF EXISTS "Les créateurs peuvent supprimer leurs packs" ON public.sticker_packs;

CREATE POLICY "Packs approuvés visibles publiquement"
  ON public.sticker_packs FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Créateurs voient leurs propres packs"
  ON public.sticker_packs FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Admins voient tous les packs"
  ON public.sticker_packs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Créateurs créent leurs packs"
  ON public.sticker_packs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id AND status IN ('draft', 'pending_review'));

CREATE POLICY "Créateurs modifient packs en draft/rejected"
  ON public.sticker_packs FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id AND status IN ('draft', 'rejected'))
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Admins modifient tous les packs"
  ON public.sticker_packs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Créateurs suppriment leurs packs draft/rejected"
  ON public.sticker_packs FOR DELETE TO authenticated
  USING (auth.uid() = creator_id AND status IN ('draft', 'rejected'));

CREATE POLICY "Admins suppriment tous les packs"
  ON public.sticker_packs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. RLS — stickers (refonte) -------------------------------------------------
DROP POLICY IF EXISTS "Les stickers des packs publiés sont publics" ON public.stickers;
DROP POLICY IF EXISTS "Les créateurs peuvent ajouter des stickers" ON public.stickers;
DROP POLICY IF EXISTS "Les créateurs peuvent modifier leurs stickers" ON public.stickers;
DROP POLICY IF EXISTS "Les créateurs peuvent supprimer leurs stickers" ON public.stickers;

-- Les metadata des stickers (pas les fichiers) restent visibles si pack approuvé OU possession OU créateur
CREATE POLICY "Stickers visibles si pack approuvé ou possédé"
  ON public.stickers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sticker_packs p
      WHERE p.id = stickers.pack_id
        AND (p.status = 'approved' OR p.creator_id = auth.uid()
             OR public.user_owns_sticker_pack(auth.uid(), p.id)
             OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Créateurs ajoutent stickers à leurs packs draft/rejected"
  ON public.stickers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sticker_packs p
      WHERE p.id = pack_id AND p.creator_id = auth.uid() AND p.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Créateurs modifient leurs stickers"
  ON public.stickers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sticker_packs p
      WHERE p.id = pack_id AND p.creator_id = auth.uid() AND p.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Créateurs suppriment leurs stickers"
  ON public.stickers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sticker_packs p
      WHERE p.id = pack_id AND p.creator_id = auth.uid() AND p.status IN ('draft', 'rejected')
    )
  );

-- 10. RLS — sticker_pack_purchases -------------------------------------------
CREATE POLICY "Acheteurs voient leurs achats"
  ON public.sticker_pack_purchases FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Créateurs voient leurs ventes"
  ON public.sticker_pack_purchases FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Admins voient tous les achats"
  ON public.sticker_pack_purchases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Pas d'INSERT/UPDATE/DELETE direct : passe par purchase_sticker_pack()

-- 11. RLS — sticker_commission_settings --------------------------------------
CREATE POLICY "Lecture publique des commissions"
  ON public.sticker_commission_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins gèrent les commissions"
  ON public.sticker_commission_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. STORAGE — bucket privé pour stickers -----------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('stickers-private', 'stickers-private', false)
ON CONFLICT (id) DO NOTHING;

-- Le bucket public 'stickers' devient privé aussi (migration totale demandée)
UPDATE storage.buckets SET public = false WHERE id = 'stickers';

-- Policies storage pour stickers-private
DROP POLICY IF EXISTS "Créateurs uploadent stickers privés" ON storage.objects;
DROP POLICY IF EXISTS "Créateurs gèrent leurs stickers privés" ON storage.objects;
DROP POLICY IF EXISTS "Possesseurs lisent stickers privés" ON storage.objects;

CREATE POLICY "Créateurs uploadent stickers privés"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'stickers-private'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Créateurs gèrent leurs stickers privés"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'stickers-private'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Pour le bucket 'stickers' (anciens fichiers + icônes/previews) : lecture authentifiée
DROP POLICY IF EXISTS "Stickers lecture authentifiée" ON storage.objects;
CREATE POLICY "Stickers lecture authentifiée"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stickers');

DROP POLICY IF EXISTS "Stickers upload créateurs" ON storage.objects;
CREATE POLICY "Stickers upload créateurs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stickers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Stickers update créateurs" ON storage.objects;
CREATE POLICY "Stickers update créateurs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stickers');

DROP POLICY IF EXISTS "Stickers delete créateurs" ON storage.objects;
CREATE POLICY "Stickers delete créateurs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stickers');
