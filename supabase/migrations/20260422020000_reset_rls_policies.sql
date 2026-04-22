-- Supprimer toutes les politiques RLS existantes et créer de nouvelles politiques appropriées

-- Désactiver RLS temporairement pour pouvoir supprimer les politiques
ALTER TABLE discussion_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_join_requests DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Allow create_discussion function to insert discussion_groups" ON discussion_groups;
DROP POLICY IF EXISTS "Allow create_discussion function to insert discussion_members" ON discussion_members;
DROP POLICY IF EXISTS "Members can view discussion_groups" ON discussion_groups;
DROP POLICY IF EXISTS "Members can view discussion_messages" ON discussion_messages;
DROP POLICY IF EXISTS "Users can view their own discussion_members" ON discussion_members;
DROP POLICY IF EXISTS "Users can create join requests" ON discussion_join_requests;
DROP POLICY IF EXISTS "Admins can update discussion_groups" ON discussion_groups;
DROP POLICY IF EXISTS "Members can insert messages" ON discussion_messages;

-- Réactiver RLS
ALTER TABLE discussion_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_join_requests ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'insertion via la fonction create_discussion (SECURITY DEFINER)
CREATE POLICY "Allow insert via create_discussion function"
ON discussion_groups
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow insert via create_discussion function"
ON discussion_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Politiques de lecture pour discussion_groups
CREATE POLICY "Authenticated users can view public discussion_groups"
ON discussion_groups
FOR SELECT
TO authenticated
USING (is_visible_in_search = true);

CREATE POLICY "Members can view their discussion_groups"
ON discussion_groups
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT discussion_id
        FROM discussion_members
        WHERE user_id = auth.uid()
    )
);

-- Politiques de lecture pour discussion_members
CREATE POLICY "Users can view their own membership"
ON discussion_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members can view other members in their discussions"
ON discussion_members
FOR SELECT
TO authenticated
USING (
    discussion_id IN (
        SELECT discussion_id
        FROM discussion_members
        WHERE user_id = auth.uid()
    )
);

-- Politiques de lecture pour discussion_messages
CREATE POLICY "Members can view messages in their discussions"
ON discussion_messages
FOR SELECT
TO authenticated
USING (
    discussion_id IN (
        SELECT discussion_id
        FROM discussion_members
        WHERE user_id = auth.uid()
    )
);

-- Politiques d'insertion pour discussion_join_requests
CREATE POLICY "Users can create join requests"
ON discussion_join_requests
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND discussion_id IN (
        SELECT id
        FROM discussion_groups
        WHERE is_visible_in_search = true
    )
);

CREATE POLICY "Users can view their own join requests"
ON discussion_join_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Politiques d'insertion pour discussion_messages
CREATE POLICY "Members can insert messages"
ON discussion_messages
FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND discussion_id IN (
        SELECT discussion_id
        FROM discussion_members
        WHERE user_id = auth.uid()
    )
);

-- Politiques d'update pour discussion_groups (admins)
CREATE POLICY "Admins can update discussion_groups"
ON discussion_groups
FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT discussion_id
        FROM discussion_members
        WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
);
