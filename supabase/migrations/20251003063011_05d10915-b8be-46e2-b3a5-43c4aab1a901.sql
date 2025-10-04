-- Table pour les médias des conversations (audios, vocaux, fichiers)
CREATE TABLE IF NOT EXISTS public.conversation_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'audio', 'voice', 'document', 'image', 'video'
  file_name TEXT,
  file_size INTEGER,
  duration_seconds INTEGER, -- Pour les audios/vocaux
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter la colonne replied_to_message_id pour les réponses
ALTER TABLE public.conversation_messages 
ADD COLUMN IF NOT EXISTS replied_to_message_id UUID REFERENCES public.conversation_messages(id) ON DELETE SET NULL;

-- Table pour les réactions aux messages de conversation
CREATE TABLE IF NOT EXISTS public.conversation_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.conversation_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour conversation_media
CREATE POLICY "Users can view media in their conversations"
  ON public.conversation_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_messages cm
      WHERE cm.id = conversation_media.message_id
        AND (cm.sender_id = auth.uid() OR cm.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert media in their messages"
  ON public.conversation_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_messages cm
      WHERE cm.id = conversation_media.message_id
        AND cm.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own media"
  ON public.conversation_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_messages cm
      WHERE cm.id = conversation_media.message_id
        AND cm.sender_id = auth.uid()
    )
  );

-- RLS Policies pour conversation_message_reactions
CREATE POLICY "Users can view reactions in their conversations"
  ON public.conversation_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_messages cm
      WHERE cm.id = conversation_message_reactions.message_id
        AND (cm.sender_id = auth.uid() OR cm.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can add reactions to messages in their conversations"
  ON public.conversation_message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_messages cm
      WHERE cm.id = conversation_message_reactions.message_id
        AND (cm.sender_id = auth.uid() OR cm.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON public.conversation_message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_conversation_media_message_id ON public.conversation_media(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_message_reactions_message_id ON public.conversation_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_replied_to ON public.conversation_messages(replied_to_message_id);

-- Enable realtime pour les nouvelles tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_media;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_message_reactions;