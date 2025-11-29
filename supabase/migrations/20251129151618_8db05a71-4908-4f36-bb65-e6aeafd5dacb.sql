-- =====================================================
-- SYSTÈME DE GESTION DES RÔLES ET PERMISSIONS FLEXIBLE
-- =====================================================

-- 1. Table des rôles (système + personnalisés par école)
CREATE TABLE IF NOT EXISTS public.school_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Un rôle système a school_id NULL, un rôle personnalisé a un school_id
  UNIQUE(name, school_id)
);

-- Index pour accélérer les requêtes
CREATE INDEX idx_school_roles_school_id ON public.school_roles(school_id);
CREATE INDEX idx_school_roles_is_system ON public.school_roles(is_system);
CREATE INDEX idx_school_roles_name ON public.school_roles(name);

-- 2. Table des permissions disponibles
CREATE TABLE IF NOT EXISTS public.school_permissions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour accélérer les requêtes
CREATE INDEX idx_school_permissions_category ON public.school_permissions(category);

-- 3. Table d'association rôle-permissions
CREATE TABLE IF NOT EXISTS public.school_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.school_roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.school_permissions(code) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- school_id NULL = permission globale du rôle système
  -- school_id NOT NULL = surcharge par école (seulement pour rôles non-système)
  UNIQUE(role_id, permission_code, school_id)
);

-- Index pour accélérer les requêtes
CREATE INDEX idx_school_role_permissions_role_id ON public.school_role_permissions(role_id);
CREATE INDEX idx_school_role_permissions_permission_code ON public.school_role_permissions(permission_code);
CREATE INDEX idx_school_role_permissions_school_id ON public.school_role_permissions(school_id);

-- 4. Table d'association utilisateur-rôle par école
CREATE TABLE IF NOT EXISTS public.school_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.school_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Un utilisateur peut avoir le même rôle une seule fois par école
  UNIQUE(user_id, school_id, role_id)
);

-- Index pour accélérer les requêtes
CREATE INDEX idx_school_user_roles_user_id ON public.school_user_roles(user_id);
CREATE INDEX idx_school_user_roles_school_id ON public.school_user_roles(school_id);
CREATE INDEX idx_school_user_roles_role_id ON public.school_user_roles(role_id);
CREATE INDEX idx_school_user_roles_user_school ON public.school_user_roles(user_id, school_id);

-- =====================================================
-- INSERTION DES RÔLES SYSTÈME
-- =====================================================
INSERT INTO public.school_roles (name, description, is_system, school_id) VALUES
  ('owner', 'Propriétaire de l''école - Accès total', TRUE, NULL),
  ('admin', 'Administrateur - Gestion complète sauf suppression école', TRUE, NULL),
  ('secretary', 'Secrétaire - Gestion administrative', TRUE, NULL),
  ('teacher', 'Enseignant - Gestion pédagogique', TRUE, NULL),
  ('parent', 'Parent d''élève - Consultation et communication', TRUE, NULL),
  ('student', 'Élève - Accès étudiant', TRUE, NULL),
  ('supervisor', 'Superviseur - Surveillance et discipline', TRUE, NULL)
ON CONFLICT (name, school_id) DO NOTHING;

-- =====================================================
-- INSERTION DES PERMISSIONS
-- =====================================================
INSERT INTO public.school_permissions (code, name, description, category) VALUES
  -- Gestion des élèves
  ('student.view', 'Voir les élèves', 'Consulter la liste des élèves', 'students'),
  ('student.create', 'Créer un élève', 'Ajouter un nouvel élève', 'students'),
  ('student.update', 'Modifier un élève', 'Modifier les informations d''un élève', 'students'),
  ('student.delete', 'Supprimer un élève', 'Supprimer un élève du système', 'students'),
  
  -- Gestion des classes
  ('class.view', 'Voir les classes', 'Consulter la liste des classes', 'classes'),
  ('class.create', 'Créer une classe', 'Créer une nouvelle classe', 'classes'),
  ('class.update', 'Modifier une classe', 'Modifier les informations d''une classe', 'classes'),
  ('class.delete', 'Supprimer une classe', 'Supprimer une classe', 'classes'),
  
  -- Gestion des enseignants
  ('teacher.view', 'Voir les enseignants', 'Consulter la liste des enseignants', 'teachers'),
  ('teacher.create', 'Ajouter un enseignant', 'Ajouter un nouvel enseignant', 'teachers'),
  ('teacher.update', 'Modifier un enseignant', 'Modifier les informations d''un enseignant', 'teachers'),
  ('teacher.delete', 'Supprimer un enseignant', 'Retirer un enseignant', 'teachers'),
  
  -- Gestion des notes
  ('grade.view', 'Voir les notes', 'Consulter les notes des élèves', 'grades'),
  ('grade.create', 'Saisir des notes', 'Saisir de nouvelles notes', 'grades'),
  ('grade.update', 'Modifier des notes', 'Modifier des notes existantes', 'grades'),
  ('grade.delete', 'Supprimer des notes', 'Supprimer des notes', 'grades'),
  
  -- Gestion des paiements
  ('payment.view', 'Voir les paiements', 'Consulter les paiements', 'payments'),
  ('payment.create', 'Enregistrer un paiement', 'Enregistrer un nouveau paiement', 'payments'),
  ('payment.update', 'Modifier un paiement', 'Modifier un paiement', 'payments'),
  ('payment.delete', 'Supprimer un paiement', 'Supprimer un paiement', 'payments'),
  ('payment.manage', 'Gérer la comptabilité', 'Accès complet à la comptabilité', 'payments'),
  
  -- Gestion de l'emploi du temps
  ('schedule.view', 'Voir l''emploi du temps', 'Consulter l''emploi du temps', 'schedule'),
  ('schedule.create', 'Créer un cours', 'Ajouter un cours à l''emploi du temps', 'schedule'),
  ('schedule.update', 'Modifier l''emploi du temps', 'Modifier l''emploi du temps', 'schedule'),
  ('schedule.delete', 'Supprimer un cours', 'Supprimer un cours de l''emploi du temps', 'schedule'),
  
  -- Gestion des matières
  ('subject.view', 'Voir les matières', 'Consulter la liste des matières', 'subjects'),
  ('subject.create', 'Créer une matière', 'Ajouter une nouvelle matière', 'subjects'),
  ('subject.update', 'Modifier une matière', 'Modifier une matière', 'subjects'),
  ('subject.delete', 'Supprimer une matière', 'Supprimer une matière', 'subjects'),
  
  -- Rapports et statistiques
  ('report.view', 'Voir les rapports', 'Consulter les rapports', 'reports'),
  ('report.create', 'Générer des rapports', 'Générer de nouveaux rapports', 'reports'),
  ('report.export', 'Exporter des rapports', 'Exporter les rapports', 'reports'),
  
  -- Messages
  ('message.view', 'Voir les messages', 'Consulter les messages', 'messages'),
  ('message.send', 'Envoyer des messages', 'Envoyer des messages', 'messages'),
  ('message.broadcast', 'Diffusion de messages', 'Envoyer des messages à tous', 'messages'),
  
  -- Paramètres de l'école
  ('settings.view', 'Voir les paramètres', 'Consulter les paramètres de l''école', 'settings'),
  ('settings.update', 'Modifier les paramètres', 'Modifier les paramètres de l''école', 'settings'),
  
  -- Gestion des rôles
  ('role.view', 'Voir les rôles', 'Consulter les rôles', 'roles'),
  ('role.create', 'Créer un rôle', 'Créer un nouveau rôle personnalisé', 'roles'),
  ('role.update', 'Modifier un rôle', 'Modifier les permissions d''un rôle', 'roles'),
  ('role.delete', 'Supprimer un rôle', 'Supprimer un rôle personnalisé', 'roles'),
  ('role.assign', 'Assigner des rôles', 'Assigner des rôles aux utilisateurs', 'roles'),
  
  -- Gestion des familles
  ('family.view', 'Voir les familles', 'Consulter les familles', 'families'),
  ('family.create', 'Créer une famille', 'Créer une nouvelle famille', 'families'),
  ('family.update', 'Modifier une famille', 'Modifier une famille', 'families'),
  ('family.delete', 'Supprimer une famille', 'Supprimer une famille', 'families'),
  
  -- Présences
  ('attendance.view', 'Voir les présences', 'Consulter les présences', 'attendance'),
  ('attendance.create', 'Saisir les présences', 'Saisir les présences', 'attendance'),
  ('attendance.update', 'Modifier les présences', 'Modifier les présences', 'attendance'),
  
  -- Applications Desktop
  ('app.classes', 'Application Classes', 'Accès à l''application Classes', 'apps'),
  ('app.students', 'Application Élèves', 'Accès à l''application Élèves', 'apps'),
  ('app.teachers', 'Application Enseignants', 'Accès à l''application Enseignants', 'apps'),
  ('app.grades', 'Application Notes', 'Accès à l''application Notes', 'apps'),
  ('app.payments', 'Application Paiements', 'Accès à l''application Paiements', 'apps'),
  ('app.accounting', 'Application Comptabilité', 'Accès à l''application Comptabilité', 'apps'),
  ('app.schedule', 'Application Emploi du temps', 'Accès à l''application Emploi du temps', 'apps'),
  ('app.subjects', 'Application Matières', 'Accès à l''application Matières', 'apps'),
  ('app.reports', 'Application Rapports', 'Accès à l''application Rapports', 'apps'),
  ('app.messages', 'Application Messages', 'Accès à l''application Messages', 'apps'),
  ('app.settings', 'Application Paramètres', 'Accès à l''application Paramètres', 'apps')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- PERMISSIONS PAR DÉFAUT POUR LES RÔLES SYSTÈME
-- =====================================================

-- Owner: Toutes les permissions
INSERT INTO public.school_role_permissions (role_id, permission_code, enabled, school_id)
SELECT r.id, p.code, TRUE, NULL
FROM public.school_roles r
CROSS JOIN public.school_permissions p
WHERE r.name = 'owner' AND r.is_system = TRUE
ON CONFLICT (role_id, permission_code, school_id) DO NOTHING;

-- Admin: Presque toutes les permissions
INSERT INTO public.school_role_permissions (role_id, permission_code, enabled, school_id)
SELECT r.id, p.code, TRUE, NULL
FROM public.school_roles r
CROSS JOIN public.school_permissions p
WHERE r.name = 'admin' AND r.is_system = TRUE
  AND p.code NOT IN ('settings.update', 'role.delete')
ON CONFLICT (role_id, permission_code, school_id) DO NOTHING;

-- Secretary: Gestion administrative
INSERT INTO public.school_role_permissions (role_id, permission_code, enabled, school_id)
SELECT r.id, p.code, TRUE, NULL
FROM public.school_roles r
CROSS JOIN public.school_permissions p
WHERE r.name = 'secretary' AND r.is_system = TRUE
  AND p.code IN (
    'student.view', 'student.create', 'student.update',
    'class.view',
    'teacher.view',
    'payment.view', 'payment.create', 'payment.update',
    'family.view', 'family.create', 'family.update',
    'message.view', 'message.send',
    'report.view',
    'app.students', 'app.payments', 'app.messages', 'app.reports'
  )
ON CONFLICT (role_id, permission_code, school_id) DO NOTHING;

-- Teacher: Gestion pédagogique
INSERT INTO public.school_role_permissions (role_id, permission_code, enabled, school_id)
SELECT r.id, p.code, TRUE, NULL
FROM public.school_roles r
CROSS JOIN public.school_permissions p
WHERE r.name = 'teacher' AND r.is_system = TRUE
  AND p.code IN (
    'student.view',
    'class.view',
    'grade.view', 'grade.create', 'grade.update',
    'schedule.view',
    'subject.view',
    'attendance.view', 'attendance.create', 'attendance.update',
    'message.view', 'message.send',
    'report.view',
    'app.classes', 'app.students', 'app.grades', 'app.schedule', 'app.messages'
  )
ON CONFLICT (role_id, permission_code, school_id) DO NOTHING;

-- Supervisor: Surveillance
INSERT INTO public.school_role_permissions (role_id, permission_code, enabled, school_id)
SELECT r.id, p.code, TRUE, NULL
FROM public.school_roles r
CROSS JOIN public.school_permissions p
WHERE r.name = 'supervisor' AND r.is_system = TRUE
  AND p.code IN (
    'student.view',
    'class.view',
    'attendance.view', 'attendance.create', 'attendance.update',
    'message.view', 'message.send',
    'app.students', 'app.classes', 'app.messages'
  )
ON CONFLICT (role_id, permission_code, school_id) DO NOTHING;

-- Parent: Consultation
INSERT INTO public.school_role_permissions (role_id, permission_code, enabled, school_id)
SELECT r.id, p.code, TRUE, NULL
FROM public.school_roles r
CROSS JOIN public.school_permissions p
WHERE r.name = 'parent' AND r.is_system = TRUE
  AND p.code IN (
    'grade.view',
    'schedule.view',
    'attendance.view',
    'message.view', 'message.send',
    'payment.view'
  )
ON CONFLICT (role_id, permission_code, school_id) DO NOTHING;

-- Student: Accès étudiant limité
INSERT INTO public.school_role_permissions (role_id, permission_code, enabled, school_id)
SELECT r.id, p.code, TRUE, NULL
FROM public.school_roles r
CROSS JOIN public.school_permissions p
WHERE r.name = 'student' AND r.is_system = TRUE
  AND p.code IN (
    'grade.view',
    'schedule.view',
    'attendance.view'
  )
ON CONFLICT (role_id, permission_code, school_id) DO NOTHING;

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.school_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FONCTIONS HELPER (SECURITY DEFINER)
-- =====================================================

-- Fonction pour vérifier si un utilisateur a une permission dans une école
CREATE OR REPLACE FUNCTION public.has_school_permission(
  _user_id UUID,
  _school_id UUID,
  _permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_owner BOOLEAN;
  _has_permission BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur est propriétaire de l'école
  SELECT EXISTS (
    SELECT 1 FROM schools
    WHERE id = _school_id AND owner_id = _user_id
  ) INTO _is_owner;
  
  IF _is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier via les rôles assignés
  -- Priorité: permissions personnalisées école > permissions système
  SELECT EXISTS (
    SELECT 1
    FROM school_user_roles sur
    JOIN school_roles sr ON sur.role_id = sr.id
    JOIN school_role_permissions srp ON sr.id = srp.role_id
    WHERE sur.user_id = _user_id
      AND sur.school_id = _school_id
      AND srp.permission_code = _permission_code
      AND srp.enabled = TRUE
      AND (
        -- Permission système (school_id NULL) pour rôle système
        (sr.is_system = TRUE AND srp.school_id IS NULL)
        OR
        -- Permission personnalisée pour rôle personnalisé de l'école
        (sr.is_system = FALSE AND sr.school_id = _school_id AND (srp.school_id IS NULL OR srp.school_id = _school_id))
      )
  ) INTO _has_permission;
  
  RETURN _has_permission;
END;
$$;

-- Fonction pour récupérer toutes les permissions d'un utilisateur dans une école
CREATE OR REPLACE FUNCTION public.get_user_school_permissions(_user_id UUID, _school_id UUID)
RETURNS TABLE(permission_code TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si propriétaire, retourner toutes les permissions
  IF EXISTS (SELECT 1 FROM schools WHERE id = _school_id AND owner_id = _user_id) THEN
    RETURN QUERY SELECT p.code FROM school_permissions p;
    RETURN;
  END IF;
  
  -- Sinon, retourner les permissions des rôles assignés
  RETURN QUERY
  SELECT DISTINCT srp.permission_code
  FROM school_user_roles sur
  JOIN school_roles sr ON sur.role_id = sr.id
  JOIN school_role_permissions srp ON sr.id = srp.role_id
  WHERE sur.user_id = _user_id
    AND sur.school_id = _school_id
    AND srp.enabled = TRUE
    AND (
      (sr.is_system = TRUE AND srp.school_id IS NULL)
      OR
      (sr.is_system = FALSE AND sr.school_id = _school_id AND (srp.school_id IS NULL OR srp.school_id = _school_id))
    );
END;
$$;

-- Fonction pour récupérer les rôles d'un utilisateur dans une école
CREATE OR REPLACE FUNCTION public.get_user_roles_in_school(_user_id UUID, _school_id UUID)
RETURNS TABLE(role_id UUID, role_name TEXT, is_system BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si propriétaire, ajouter le rôle owner
  IF EXISTS (SELECT 1 FROM schools WHERE id = _school_id AND owner_id = _user_id) THEN
    RETURN QUERY
    SELECT r.id, r.name, r.is_system
    FROM school_roles r
    WHERE r.name = 'owner' AND r.is_system = TRUE;
  END IF;
  
  -- Retourner les rôles assignés
  RETURN QUERY
  SELECT r.id, r.name, r.is_system
  FROM school_user_roles sur
  JOIN school_roles r ON sur.role_id = r.id
  WHERE sur.user_id = _user_id
    AND sur.school_id = _school_id;
END;
$$;

-- Fonction pour vérifier si un utilisateur est admin ou owner d'une école
CREATE OR REPLACE FUNCTION public.is_school_admin_or_owner(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Propriétaire ?
  IF EXISTS (SELECT 1 FROM schools WHERE id = _school_id AND owner_id = _user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- A le rôle admin ?
  RETURN EXISTS (
    SELECT 1
    FROM school_user_roles sur
    JOIN school_roles r ON sur.role_id = r.id
    WHERE sur.user_id = _user_id
      AND sur.school_id = _school_id
      AND r.name = 'admin'
      AND r.is_system = TRUE
  );
END;
$$;

-- =====================================================
-- POLICIES RLS
-- =====================================================

-- Roles: Lecture pour tous les authentifiés, écriture pour admin/owner
CREATE POLICY "Anyone can view system roles"
ON public.school_roles FOR SELECT
TO authenticated
USING (is_system = TRUE AND school_id IS NULL);

CREATE POLICY "School members can view school roles"
ON public.school_roles FOR SELECT
TO authenticated
USING (
  school_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM schools WHERE id = school_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM school_user_roles WHERE school_id = school_roles.school_id AND user_id = auth.uid())
  )
);

CREATE POLICY "Admins can create school roles"
ON public.school_roles FOR INSERT
TO authenticated
WITH CHECK (
  is_system = FALSE AND
  school_id IS NOT NULL AND
  is_school_admin_or_owner(auth.uid(), school_id)
);

CREATE POLICY "Admins can update school roles"
ON public.school_roles FOR UPDATE
TO authenticated
USING (
  is_system = FALSE AND
  school_id IS NOT NULL AND
  is_school_admin_or_owner(auth.uid(), school_id)
);

CREATE POLICY "Admins can delete school roles"
ON public.school_roles FOR DELETE
TO authenticated
USING (
  is_system = FALSE AND
  school_id IS NOT NULL AND
  is_school_admin_or_owner(auth.uid(), school_id)
);

-- Permissions: Lecture pour tous
CREATE POLICY "Anyone can view permissions"
ON public.school_permissions FOR SELECT
TO authenticated
USING (TRUE);

-- Role_permissions: Lecture pour tous, écriture uniquement pour rôles non-système
CREATE POLICY "View system role permissions"
ON public.school_role_permissions FOR SELECT
TO authenticated
USING (school_id IS NULL);

CREATE POLICY "View school role permissions"
ON public.school_role_permissions FOR SELECT
TO authenticated
USING (
  school_id IS NOT NULL AND
  is_school_admin_or_owner(auth.uid(), school_id)
);

-- Empêcher la modification des permissions des rôles système
CREATE POLICY "Admins can manage custom role permissions"
ON public.school_role_permissions FOR INSERT
TO authenticated
WITH CHECK (
  school_id IS NOT NULL AND
  is_school_admin_or_owner(auth.uid(), school_id) AND
  EXISTS (
    SELECT 1 FROM school_roles 
    WHERE id = role_id AND is_system = FALSE AND school_id = school_role_permissions.school_id
  )
);

CREATE POLICY "Admins can update custom role permissions"
ON public.school_role_permissions FOR UPDATE
TO authenticated
USING (
  school_id IS NOT NULL AND
  is_school_admin_or_owner(auth.uid(), school_id) AND
  EXISTS (
    SELECT 1 FROM school_roles 
    WHERE id = role_id AND is_system = FALSE
  )
);

CREATE POLICY "Admins can delete custom role permissions"
ON public.school_role_permissions FOR DELETE
TO authenticated
USING (
  school_id IS NOT NULL AND
  is_school_admin_or_owner(auth.uid(), school_id) AND
  EXISTS (
    SELECT 1 FROM school_roles 
    WHERE id = role_id AND is_system = FALSE
  )
);

-- User_school_roles: Lecture pour concernés, écriture pour admin/owner
CREATE POLICY "Users can view their own roles"
ON public.school_user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view school user roles"
ON public.school_user_roles FOR SELECT
TO authenticated
USING (is_school_admin_or_owner(auth.uid(), school_id));

CREATE POLICY "Admins can assign roles"
ON public.school_user_roles FOR INSERT
TO authenticated
WITH CHECK (is_school_admin_or_owner(auth.uid(), school_id));

CREATE POLICY "Admins can update user roles"
ON public.school_user_roles FOR UPDATE
TO authenticated
USING (is_school_admin_or_owner(auth.uid(), school_id));

CREATE POLICY "Admins can remove user roles"
ON public.school_user_roles FOR DELETE
TO authenticated
USING (is_school_admin_or_owner(auth.uid(), school_id));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour updated_at sur school_roles
CREATE TRIGGER update_school_roles_updated_at
BEFORE UPDATE ON public.school_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour updated_at sur school_user_roles
CREATE TRIGGER update_school_user_roles_updated_at
BEFORE UPDATE ON public.school_user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();