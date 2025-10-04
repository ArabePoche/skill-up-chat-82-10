-- Ajouter la colonne is_story_reply à conversation_messages
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS is_story_reply BOOLEAN DEFAULT false;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_conversation_messages_is_story_reply 
ON conversation_messages(is_story_reply);

-- Mettre à jour les messages existants : considérer qu'ils sont tous des réponses aux stories
UPDATE conversation_messages 
SET is_story_reply = true 
WHERE is_story_reply IS NULL;