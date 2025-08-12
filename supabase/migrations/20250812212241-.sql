-- Allow users to edit and delete their own non-system lesson messages
-- and create a message_reactions table for emoji reactions

-- Policies for lesson_messages (table already exists and RLS is enabled)
-- Update: allow sender to update their own non-system messages
CREATE POLICY IF NOT EXISTS "Users can update own non-system messages"
ON public.lesson_messages
FOR UPDATE
USING (auth.uid() = sender_id AND is_system_message = false)
WITH CHECK (auth.uid() = sender_id AND is_system_message = false);

-- Delete: allow sender to delete their own non-system messages
CREATE POLICY IF NOT EXISTS "Users can delete own non-system messages"
ON public.lesson_messages
FOR DELETE
USING (auth.uid() = sender_id AND is_system_message = false);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.lesson_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for reactions
-- Insert own reaction
CREATE POLICY IF NOT EXISTS "Users can insert own reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Delete own reaction
CREATE POLICY IF NOT EXISTS "Users can delete own reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Read reactions (authenticated users)
CREATE POLICY IF NOT EXISTS "Authenticated can read reactions"
ON public.message_reactions
FOR SELECT
USING (auth.role() = 'authenticated');