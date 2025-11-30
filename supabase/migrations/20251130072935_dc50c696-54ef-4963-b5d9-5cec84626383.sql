-- Ajouter la contrainte unique manquante sur school_staff pour permettre l'upsert
ALTER TABLE public.school_staff 
ADD CONSTRAINT school_staff_school_id_user_id_key UNIQUE (school_id, user_id); 