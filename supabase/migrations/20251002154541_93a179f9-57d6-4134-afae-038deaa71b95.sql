-- Migration pour simplifier le système de stories
-- Étape 1: Supprimer les policies qui dépendent de conversation_id
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON story_messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON story_messages;

-- Étape 2: Supprimer la colonne conversation_id et ajouter story_id
ALTER TABLE story_messages 
  DROP COLUMN IF EXISTS conversation_id CASCADE,
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES user_stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Étape 3: Créer les nouvelles RLS policies
CREATE POLICY "Users can view their story messages"
ON story_messages FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id OR
  auth.uid() IN (
    SELECT user_id FROM user_stories WHERE id = story_messages.story_id
  )
);

CREATE POLICY "Users can send story messages"
ON story_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Étape 4: Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_story_messages_story_id ON story_messages(story_id);
CREATE INDEX IF NOT EXISTS idx_story_messages_sender_receiver ON story_messages(sender_id, receiver_id);

-- Étape 5: Supprimer la table story_conversations qui n'est plus nécessaire
DROP TABLE IF EXISTS story_conversations CASCADE;