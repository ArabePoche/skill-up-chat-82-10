
-- Ajouter la colonne enrollment_id si elle n'existe pas déjà
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' 
                   AND column_name = 'enrollment_id') THEN
        ALTER TABLE public.notifications ADD COLUMN enrollment_id uuid REFERENCES public.enrollment_requests(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Activer RLS sur la table notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Créer une fonction sécurisée pour vérifier le rôle admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Supprimer et recréer toutes les politiques pour éviter les conflits
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view admin notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON public.notifications;

-- Politique pour que les utilisateurs voient leurs propres notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = auth.uid());

-- Politique pour que les admins voient toutes les notifications qui leur sont destinées
CREATE POLICY "Admins can view admin notifications" 
ON public.notifications FOR SELECT 
USING (
  is_for_all_admins = true AND public.is_admin(auth.uid())
);

-- Politique pour permettre aux admins de mettre à jour les notifications (marquer comme lues)
CREATE POLICY "Admins can update notifications" 
ON public.notifications FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Politique pour permettre l'insertion de notifications (système)
CREATE POLICY "Allow system to insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);
