-- Désactiver RLS pour permettre l'insertion depuis l'Edge Function
-- L'Edge Function utilise l'authentification directe avec supabaseClient

ALTER TABLE discussion_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_join_requests DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Allow insert via create_discussion function" ON discussion_groups;
DROP POLICY IF EXISTS "Allow insert via create_discussion function" ON discussion_members;
DROP POLICY IF EXISTS "Authenticated users can view public discussion_groups" ON discussion_groups;
DROP POLICY IF EXISTS "Members can view their discussion_groups" ON discussion_groups;
DROP POLICY IF EXISTS "Users can view their own membership" ON discussion_members;
DROP POLICY IF EXISTS "Members can view other members in their discussions" ON discussion_members;
DROP POLICY IF EXISTS "Members can view messages in their discussions" ON discussion_messages;
DROP POLICY IF EXISTS "Users can create join requests" ON discussion_join_requests;
DROP POLICY IF EXISTS "Users can view their own join requests" ON discussion_join_requests;
DROP POLICY IF EXISTS "Members can insert messages" ON discussion_messages;
DROP POLICY IF EXISTS "Admins can update discussion_groups" ON discussion_groups;
