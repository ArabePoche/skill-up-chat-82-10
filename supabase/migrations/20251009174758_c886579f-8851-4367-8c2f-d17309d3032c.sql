-- Créer la table des demandes d'amitié
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Activer RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Policy : voir ses propres demandes (envoyées et reçues)
CREATE POLICY "Users can view their own friend requests"
ON public.friend_requests
FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Policy : créer une demande d'amitié
CREATE POLICY "Users can send friend requests"
ON public.friend_requests
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND sender_id != receiver_id
);

-- Policy : accepter/refuser une demande reçue
CREATE POLICY "Users can update received requests"
ON public.friend_requests
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Policy : supprimer sa propre demande envoyée
CREATE POLICY "Users can delete their sent requests"
ON public.friend_requests
FOR DELETE
USING (auth.uid() = sender_id);

-- Créer un index pour améliorer les performances
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_friend_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friend_requests_updated_at_trigger
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION update_friend_requests_updated_at();