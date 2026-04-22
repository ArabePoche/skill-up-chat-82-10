-- Système de groupes de discussion avancé inspiré de Telegram/WhatsApp
-- Supporte différents types de visibilité, filtrage par genre, et historique configurable

-- Table des groupes
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    
    -- Type de groupe (visibilité et accès)
    group_type TEXT NOT NULL DEFAULT 'MIXED' CHECK (group_type IN ('PUBLIC', 'PRIVATE', 'MIXTE')),
    
    -- Configuration MIXTE spécifique
    is_visible_in_search BOOLEAN DEFAULT true,
    join_approval_required BOOLEAN DEFAULT false,
    invite_link TEXT,
    
    -- Filtrage par genre (option communautaire)
    audience_type TEXT NOT NULL DEFAULT 'ALL' CHECK (audience_type IN ('ALL', 'MEN_ONLY', 'WOMEN_ONLY')),
    
    -- Historique des messages
    show_history_to_new_members BOOLEAN DEFAULT false,
    
    -- Métadonnées
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    member_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des membres de groupe
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Rôle dans le groupe
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MODERATOR', 'MEMBER')),
    
    -- Date d'entrée (pour l'historique)
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Statut
    is_active BOOLEAN DEFAULT true,
    
    -- Contraintes
    UNIQUE(group_id, user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des messages de groupe
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'STICKER')),
    attachment_url TEXT,
    reply_to_message_id UUID REFERENCES group_messages(id),
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false
);

-- Table des demandes d'adhésion (pour les groupes avec approval)
CREATE TABLE IF NOT EXISTS group_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(group_id, user_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_group_type ON groups(group_type);
CREATE INDEX idx_groups_audience_type ON groups(audience_type);
CREATE INDEX idx_groups_visible ON groups(is_visible_in_search) WHERE is_visible_in_search = true;
CREATE INDEX idx_groups_search ON groups USING gin(to_tsvector('french', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_groups_member_count ON groups(member_count DESC);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(role);
CREATE INDEX idx_group_members_active ON group_members(is_active) WHERE is_active = true;

CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX idx_group_messages_reply_to ON group_messages(reply_to_message_id);

CREATE INDEX idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX idx_group_join_requests_status ON group_join_requests(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_groups_updated_at();

CREATE TRIGGER trg_group_members_updated_at
    BEFORE UPDATE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_groups_updated_at();

CREATE TRIGGER trg_group_messages_updated_at
    BEFORE UPDATE ON group_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_groups_updated_at();

-- Trigger pour mettre à jour member_count quand un membre est ajouté/supprimé
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        UPDATE groups 
        SET member_count = member_count + 1,
            updated_at = NOW()
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active = true AND NEW.is_active = false THEN
            UPDATE groups 
            SET member_count = member_count - 1,
                updated_at = NOW()
            WHERE id = NEW.group_id;
        ELSIF OLD.is_active = false AND NEW.is_active = true THEN
            UPDATE groups 
            SET member_count = member_count + 1,
                updated_at = NOW()
            WHERE id = NEW.group_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
        UPDATE groups 
        SET member_count = member_count - 1,
            updated_at = NOW()
        WHERE id = OLD.group_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_group_member_count
    AFTER INSERT OR UPDATE OR DELETE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_group_member_count();

-- Trigger pour mettre à jour message_count et last_message_at
CREATE OR REPLACE FUNCTION update_group_message_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
        UPDATE groups 
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            UPDATE groups 
            SET message_count = message_count - 1,
                updated_at = NOW()
            WHERE id = NEW.group_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_group_message_stats
    AFTER INSERT OR UPDATE ON group_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_group_message_stats();

-- Fonction pour vérifier si un utilisateur peut rejoindre un groupe selon le genre
CREATE OR REPLACE FUNCTION can_join_group_by_gender(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_group_audience_type TEXT;
    v_user_gender TEXT;
BEGIN
    -- Récupérer le type d'audience du groupe
    SELECT audience_type INTO v_group_audience_type
    FROM groups
    WHERE id = p_group_id;
    
    -- Si le groupe est ouvert à tous, OK
    IF v_group_audience_type = 'ALL' THEN
        RETURN true;
    END IF;
    
    -- Récupérer le genre de l'utilisateur
    SELECT gender INTO v_user_gender
    FROM profiles
    WHERE id = p_user_id;
    
    -- Vérifier selon le type d'audience
    IF v_group_audience_type = 'MEN_ONLY' THEN
        RETURN v_user_gender = 'male';
    ELSIF v_group_audience_type = 'WOMEN_ONLY' THEN
        RETURN v_user_gender = 'female';
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer un groupe
CREATE OR REPLACE FUNCTION create_group(
    p_name TEXT,
    p_description TEXT,
    p_avatar_url TEXT,
    p_group_type TEXT,
    p_is_visible_in_search BOOLEAN,
    p_join_approval_required BOOLEAN,
    p_audience_type TEXT,
    p_show_history_to_new_members BOOLEAN,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_group_id UUID;
BEGIN
    INSERT INTO groups (
        name,
        description,
        avatar_url,
        group_type,
        is_visible_in_search,
        join_approval_required,
        audience_type,
        show_history_to_new_members,
        created_by
    ) VALUES (
        p_name,
        p_description,
        p_avatar_url,
        p_group_type,
        p_is_visible_in_search,
        p_join_approval_required,
        p_audience_type,
        p_show_history_to_new_members,
        p_created_by
    ) RETURNING id INTO v_group_id;
    
    -- Le créateur devient admin automatiquement
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_group_id, p_created_by, 'ADMIN');
    
    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON TABLE groups IS 'Groupes de discussion avec configuration avancée (visibilité, audience, historique)';
COMMENT ON COLUMN groups.group_type IS 'Type de groupe : PUBLIC, PRIVATE, MIXTE';
COMMENT ON COLUMN groups.is_visible_in_search IS 'Visible dans la recherche globale (pour MIXTE)';
COMMENT ON COLUMN groups.join_approval_required IS 'Approbation requise pour rejoindre (pour MIXTE)';
COMMENT ON COLUMN groups.audience_type IS 'Filtre de genre : ALL, MEN_ONLY, WOMEN_ONLY';
COMMENT ON COLUMN groups.show_history_to_new_members IS 'Les nouveaux membres voient-ils l''historique complet ?';

COMMENT ON TABLE group_members IS 'Membres des groupes avec rôles (ADMIN, MODERATOR, MEMBER)';
COMMENT ON COLUMN group_members.role IS 'Rôle dans le groupe';
COMMENT ON COLUMN group_members.joined_at IS 'Date d''entrée (utilisé pour l''historique)';

COMMENT ON TABLE group_messages IS 'Messages des groupes';
COMMENT ON TABLE group_join_requests IS 'Demandes d''adhésion aux groupes';
