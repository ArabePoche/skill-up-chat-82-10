-- Ajouter une policy pour permettre aux utilisateurs de marquer comme lus les messages reçus
CREATE POLICY "Users can mark received messages as read"
ON conversation_messages
FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);