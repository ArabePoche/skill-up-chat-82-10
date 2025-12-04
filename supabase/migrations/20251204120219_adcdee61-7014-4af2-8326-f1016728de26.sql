-- Ajouter parent_id pour la hiérarchie de dossiers
ALTER TABLE public.desktop_folders 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.desktop_folders(id) ON DELETE CASCADE;

-- Ajouter wallpaper_url au profil utilisateur
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallpaper_url TEXT DEFAULT 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';

-- Index pour améliorer les requêtes sur parent_id
CREATE INDEX IF NOT EXISTS idx_desktop_folders_parent_id ON public.desktop_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_desktop_folders_user_id ON public.desktop_folders(user_id);