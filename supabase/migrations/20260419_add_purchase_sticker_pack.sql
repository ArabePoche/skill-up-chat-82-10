-- Migration: Ajout de la fonction purchase_sticker_pack pour débloquer un pack de stickers
-- Cette fonction ajoute une ligne dans user_sticker_packs si l'utilisateur ne possède pas déjà le pack
-- Elle gère aussi bien les packs gratuits que payants (vérification du prix à ajouter si besoin)

create or replace function purchase_sticker_pack(
  _pack_id uuid,
  _use_sb_amount integer default 0
)
returns jsonb
language plpgsql
security definer
as $$
declare
  _user_id uuid := auth.uid();
  _pack record;
  _already_unlocked boolean;
begin
  -- Vérifier que l'utilisateur est authentifié
  if _user_id is null then
    return jsonb_build_object('success', false, 'error', 'Utilisateur non authentifié (auth.uid() = null)');
  end if;
  -- Vérifier que le pack existe et est approuvé
  select * into _pack from sticker_packs where id = _pack_id and status = 'approved';
  if not found then
    return jsonb_build_object('success', false, 'error', 'Pack introuvable ou non approuvé');
  end if;

  -- Vérifier si déjà débloqué
  select exists(select 1 from user_sticker_packs where user_id = _user_id and pack_id = _pack_id) into _already_unlocked;
  if _already_unlocked then
    return jsonb_build_object('success', false, 'error', 'Pack déjà débloqué');
  end if;

  -- Pour un pack gratuit, on ajoute simplement
  if coalesce(_pack.price_sc, 0) = 0 then
    insert into user_sticker_packs(user_id, pack_id, unlocked_at)
    values (_user_id, _pack_id, now());
    return jsonb_build_object('success', true);
  end if;

  -- TODO: Gérer la logique de paiement SC/SB ici (décrémenter le wallet, etc.)
  -- Pour l'instant, on refuse l'achat payant
  return jsonb_build_object('success', false, 'error', 'Paiement non implémenté');
end;
$$;
