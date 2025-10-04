-- Renommer la table story_messages en conversation_messages
ALTER TABLE story_messages RENAME TO conversation_messages;

-- Renommer les index associés
ALTER INDEX IF EXISTS idx_story_messages_story_id RENAME TO idx_conversation_messages_story_id;
ALTER INDEX IF EXISTS idx_story_messages_sender_receiver RENAME TO idx_conversation_messages_sender_receiver;
ALTER INDEX IF EXISTS idx_story_messages_is_story_reply RENAME TO idx_conversation_messages_is_story_reply;

-- Renommer la contrainte de clé primaire
ALTER TABLE conversation_messages RENAME CONSTRAINT story_messages_pkey TO conversation_messages_pkey;

-- Mettre à jour les politiques RLS
DROP POLICY IF EXISTS "Users can delete their own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can view messages they are part of" ON conversation_messages;

CREATE POLICY "Users can delete their own messages" 
ON conversation_messages FOR DELETE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can insert their own messages" 
ON conversation_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" 
ON conversation_messages FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can view messages they are part of" 
ON conversation_messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);