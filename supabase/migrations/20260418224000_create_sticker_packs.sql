-- Création du bucket 'stickers' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stickers', 'stickers', true)
ON CONFLICT (id) DO NOTHING;

-- RLS pour le bucket: tout le monde peut lire (public), utilisateurs loggés peuvent créer
CREATE POLICY "Public sticker Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'stickers');

CREATE POLICY "Authenticated users can upload stickers" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'stickers');

CREATE POLICY "Users can update their own stickers" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'stickers' AND owner = auth.uid());

CREATE POLICY "Users can delete their own stickers" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'stickers' AND owner = auth.uid());

-- Création de la table sticker_packs
CREATE TABLE public.sticker_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Si NULL, = Pack system officiel
    price INT DEFAULT 0, -- 0 = gratuit, SC sinon
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Création de la table stickers
CREATE TABLE public.stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    is_animated BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Création de la table des packs possédés par les utilisateurs
CREATE TABLE public.user_sticker_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pack_id)
);

-- Activer le RLS
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sticker_packs ENABLE ROW LEVEL SECURITY;

-- Politiques pour sticker_packs
CREATE POLICY "Les packs publiés sont publics" 
ON public.sticker_packs FOR SELECT 
USING (is_published = true OR creator_id IS NULL);

CREATE POLICY "Les créateurs voient leurs packs" 
ON public.sticker_packs FOR SELECT 
TO authenticated USING (auth.uid() = creator_id);

CREATE POLICY "Les créateurs peuvent ajouter des packs" 
ON public.sticker_packs FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Les créateurs peuvent modifier leurs packs" 
ON public.sticker_packs FOR UPDATE 
TO authenticated USING (auth.uid() = creator_id);

CREATE POLICY "Les créateurs peuvent supprimer leurs packs" 
ON public.sticker_packs FOR DELETE 
TO authenticated USING (auth.uid() = creator_id);

-- Politiques pour stickers
CREATE POLICY "Les stickers des packs publiés sont publics" 
ON public.stickers FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.sticker_packs 
        WHERE id = pack_id AND (is_published = true OR creator_id IS NULL OR creator_id = auth.uid())
    )
);

CREATE POLICY "Les créateurs peuvent ajouter des stickers" 
ON public.stickers FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sticker_packs 
        WHERE id = pack_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Les créateurs peuvent modifier leurs stickers" 
ON public.stickers FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.sticker_packs 
        WHERE id = pack_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Les créateurs peuvent supprimer leurs stickers" 
ON public.stickers FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.sticker_packs 
        WHERE id = pack_id AND creator_id = auth.uid()
    )
);

-- Politiques pour user_sticker_packs
CREATE POLICY "Les utilisateurs voient leurs propres téléchargements" 
ON public.user_sticker_packs FOR SELECT 
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent télécharger un pack" 
ON public.user_sticker_packs FOR INSERT 
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent retirer un pack" 
ON public.user_sticker_packs FOR DELETE 
TO authenticated USING (auth.uid() = user_id);
