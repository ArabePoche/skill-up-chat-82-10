-- Table pour les favoris d'emojis et stickers des utilisateurs
CREATE TABLE IF NOT EXISTS user_emoji_sticker_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('emoji', 'sticker')),
  item_id VARCHAR(255) NOT NULL, -- Pour les emojis: le caractère emoji, pour les stickers: l'ID du sticker
  item_data JSONB, -- Données supplémentaires (URL pour stickers, nom pour emojis, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un utilisateur ne peut pas ajouter le même item en favori plusieurs fois
  UNIQUE(user_id, item_type, item_id)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_user_emoji_sticker_favorites_user_id ON user_emoji_sticker_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emoji_sticker_favorites_type ON user_emoji_sticker_favorites(item_type);
CREATE INDEX IF NOT EXISTS idx_user_emoji_sticker_favorites_created_at ON user_emoji_sticker_favorites(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_emoji_sticker_favorites_updated_at 
  BEFORE UPDATE ON user_emoji_sticker_favorites 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
