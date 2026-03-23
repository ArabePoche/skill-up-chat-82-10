-- Ajouter les colonnes manquantes à habbah_events si elles n'existent pas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'habbah_events' AND column_name = 'description') THEN
    ALTER TABLE habbah_events ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'habbah_events' AND column_name = 'related_user_id') THEN
    ALTER TABLE habbah_events ADD COLUMN related_user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Mise à jour du trigger pour synchroniser habbah_events -> user_wallets ET wallet_transactions
CREATE OR REPLACE FUNCTION public.handle_habbah_gain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_type text;
  v_description text;
BEGIN
  -- 1. Update Wallet (Mise à jour du solde)
  -- On utilise un UPSERT
  INSERT INTO public.user_wallets (user_id, habbah, soumboulah_cash, soumboulah_bonus)
  VALUES (NEW.user_id, NEW.habbah_earned, 0, 0)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    habbah = user_wallets.habbah + NEW.habbah_earned,
    updated_at = now();
    
  -- 2. Determine Transaction Type pour l'historique
  IF NEW.event_type = 'transfer_sent' THEN
    v_transaction_type := 'gift';
    v_description := COALESCE(NEW.description, 'Cadeau envoyé');
  ELSIF NEW.event_type = 'transfer_received' THEN
    v_transaction_type := 'gift';
    v_description := COALESCE(NEW.description, 'Cadeau reçu');
  ELSIF NEW.habbah_earned >= 0 THEN
    v_transaction_type := 'earn';
    v_description := COALESCE(NEW.description, 'Gain Habbah');
  ELSE
    v_transaction_type := 'spend';
    v_description := COALESCE(NEW.description, 'Dépense Habbah');
  END IF;

  -- 3. Insert into wallet_transactions (Historique visible par l'utilisateur)
  -- On enregistre le montant signé pour être cohérent avec l'impact sur le solde
  INSERT INTO public.wallet_transactions (
    user_id,
    currency,
    amount,
    transaction_type,
    description,
    reference_id,
    reference_type
  ) VALUES (
    NEW.user_id,
    'habbah',
    NEW.habbah_earned,
    v_transaction_type,
    v_description,
    NEW.reference_id,
    'habbah_event'
  );

  RETURN NEW;
END;
$$;

-- Fonction pour transférer des Habbah entre utilisateurs
-- NOTE: Cette fonction n'update plus user_wallets directement, elle insère des événements
-- et laisse le trigger `handle_habbah_gain` faire la mise à jour et l'historique.
CREATE OR REPLACE FUNCTION transfer_habbah(
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'gift',
  p_reference_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_sender_balance NUMERIC;
  v_new_sender_balance NUMERIC;
  v_video_id UUID;
  v_video_title TEXT;
  v_description TEXT;
BEGIN
  -- Récupérer l'ID de l'utilisateur courant (expéditeur)
  v_sender_id := auth.uid();
  
  -- Vérifier que l'expéditeur est connecté
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  -- Vérifier que le montant est positif
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant invalide');
  END IF;

  -- Vérifier que l'expéditeur n'est pas le destinataire
  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Vous ne pouvez pas vous envoyer de l''argent à vous-même');
  END IF;

  -- Essayer de récupérer le titre de la vidéo si reference_id est un UUID valide
  v_video_id := NULL;
  v_video_title := NULL;
  
  IF p_reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN
      v_video_id := p_reference_id::UUID;
      -- On fait un SELECT simple. Si la table n'existe pas, cela lèvera une exception catchée plus bas (dans le bloc principal) 
      -- ou on peut laisser planter si on est sûr que la table existe.
      -- Pour être robuste, on peut wrapper ce select.
      SELECT title INTO v_video_title FROM public.videos WHERE id = v_video_id;
    EXCEPTION WHEN OTHERS THEN
       -- Si erreur (ex: table videos n'existe pas), on ignore
       v_video_title := NULL;
    END;
  END IF;

  -- Construire la description pour l'historique
  IF v_video_title IS NOT NULL THEN
    v_description := 'Cadeau pour : ' || v_video_title;
  ELSE
    v_description := COALESCE(p_reason, 'Cadeau envoyé');
  END IF;

  -- Verrouiller le wallet de l'expéditeur pour lecture seule au début (check balance)
  SELECT habbah INTO v_sender_balance
  FROM user_wallets
  WHERE user_id = v_sender_id;

  -- Initialiser le wallet si inexistant
  IF v_sender_balance IS NULL THEN
    INSERT INTO user_wallets (user_id, habbah)
    VALUES (v_sender_id, 0)
    RETURNING habbah INTO v_sender_balance;
  END IF;

  -- Vérifier si le wallet existe et solde suffisant
  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  -- Enregistrer la transaction pour l'expéditeur (débit)
  INSERT INTO habbah_events (
    user_id, 
    habbah_earned, 
    event_type, 
    description,
    reference_id,
    related_user_id
  ) VALUES (
    v_sender_id, 
    -p_amount, 
    'transfer_sent', 
    v_description,
    p_recipient_id::text,
    p_recipient_id
  );

  -- Enregistrer la transaction pour le destinataire (crédit)
  INSERT INTO habbah_events (
    user_id, 
    habbah_earned, 
    event_type, 
    description,
    reference_id,
    related_user_id
  ) VALUES (
    p_recipient_id, 
    p_amount, 
    'transfer_received', 
    v_description,
    p_reference_id,
    v_sender_id
  );

  -- Créer une notification pour le destinataire
  INSERT INTO notifications (
    user_id,
    sender_id,
    type,
    title,
    message,
    video_id,
    is_read
  ) VALUES (
    p_recipient_id,
    v_sender_id,
    'gift_received',
    'Cadeau reçu !',
    'Vous avez reçu ' || p_amount || ' Habbah en cadeau !',
    v_video_id, -- UUID ou NULL (Fixe l'erreur de type)
    false
  );

  -- Récupérer le nouveau solde pour le retourner
  SELECT habbah INTO v_new_sender_balance
  FROM user_wallets
  WHERE user_id = v_sender_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Transfert effectué avec succès',
    'new_balance', v_new_sender_balance
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
