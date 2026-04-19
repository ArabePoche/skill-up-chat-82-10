-- ============================================================================
-- MODÉRATION INDIVIDUELLE DES STICKERS
-- Les créateurs peuvent ajouter des stickers à n'importe quel pack approuvé.
-- Chaque sticker a son propre statut : pending_review | approved | rejected.
-- L'admin approuve/rejette les stickers individuellement.
-- ============================================================================

-- 1. Ajouter un statut individuel aux stickers
ALTER TABLE public.stickers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_review'
  CHECK (status IN ('pending_review', 'approved', 'rejected'));

-- 2. Migrer les stickers existants des packs approuvés → approved
UPDATE public.stickers s
SET status = 'approved'
FROM public.sticker_packs p
WHERE s.pack_id = p.id AND p.status = 'approved';

-- 3. Mettre à jour review_sticker_pack : approuver le pack → approuve tous ses stickers
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

  -- Quand un pack est approuvé, tous ses stickers en attente deviennent approuvés
  IF _decision = 'approve' THEN
    UPDATE public.stickers
    SET status = 'approved'
    WHERE pack_id = _pack_id AND status = 'pending_review';
  END IF;

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END; $$;

-- 4. Nouvelle fonction : approuver/rejeter un sticker individuel (admin)
CREATE OR REPLACE FUNCTION public.review_sticker(
  _sticker_id uuid,
  _decision text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Réservé aux admins');
  END IF;
  IF _decision = 'approve' THEN v_new_status := 'approved';
  ELSIF _decision = 'reject' THEN v_new_status := 'rejected';
  ELSE RETURN jsonb_build_object('success', false, 'error', 'Décision invalide');
  END IF;

  UPDATE public.stickers
  SET status = v_new_status
  WHERE id = _sticker_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sticker introuvable');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END; $$;

-- 5. RLS — stickers (refonte)
DROP POLICY IF EXISTS "Stickers visibles si pack approuvé ou possédé" ON public.stickers;
DROP POLICY IF EXISTS "Créateurs ajoutent stickers à leurs packs draft/rejected" ON public.stickers;
DROP POLICY IF EXISTS "Créateurs modifient leurs stickers" ON public.stickers;
DROP POLICY IF EXISTS "Créateurs suppriment leurs stickers" ON public.stickers;

-- SELECT : sticker visible si approuvé ET pack approuvé ou possédé ; créateur voit tous ses stickers ; admin voit tout
CREATE POLICY "Stickers visibles si approuvé ou propriétaire ou admin"
  ON public.stickers FOR SELECT
  USING (
    -- Admin voit tout
    public.has_role(auth.uid(), 'admin')
    OR
    -- Créateur voit tous ses stickers (toutes statuses)
    EXISTS (
      SELECT 1 FROM public.sticker_packs p
      WHERE p.id = stickers.pack_id AND p.creator_id = auth.uid()
    )
    OR
    -- Autres : sticker approuvé dans un pack approuvé ou possédé
    (
      stickers.status = 'approved'
      AND EXISTS (
        SELECT 1 FROM public.sticker_packs p
        WHERE p.id = stickers.pack_id
          AND (
            p.status = 'approved'
            OR public.user_owns_sticker_pack(auth.uid(), p.id)
          )
      )
    )
  );

-- INSERT : les créateurs peuvent ajouter des stickers à N'IMPORTE LEQUEL de leurs packs
CREATE POLICY "Créateurs ajoutent stickers à leurs packs"
  ON public.stickers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sticker_packs p
      WHERE p.id = pack_id AND p.creator_id = auth.uid()
    )
  );

-- UPDATE : créateur gère ses stickers en pending/rejected ; admin gère tout
CREATE POLICY "Créateurs et admins modifient les stickers"
  ON public.stickers FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR
    (
      stickers.status IN ('pending_review', 'rejected')
      AND EXISTS (
        SELECT 1 FROM public.sticker_packs p
        WHERE p.id = pack_id AND p.creator_id = auth.uid()
      )
    )
  );

-- DELETE : créateur supprime ses stickers non approuvés ; admin supprime tout
CREATE POLICY "Créateurs et admins suppriment les stickers"
  ON public.stickers FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR
    (
      stickers.status IN ('pending_review', 'rejected')
      AND EXISTS (
        SELECT 1 FROM public.sticker_packs p
        WHERE p.id = pack_id AND p.creator_id = auth.uid()
      )
    )
  );
