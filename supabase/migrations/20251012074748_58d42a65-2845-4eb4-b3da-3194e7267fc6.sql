-- Ajouter un champ pour savoir à qui on répond directement dans les commentaires de posts
ALTER TABLE post_comments
ADD COLUMN replied_to_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Index pour améliorer les performances de recherche par replied_to_user_id
CREATE INDEX idx_post_comments_replied_to_user ON post_comments(replied_to_user_id);

-- Commentaire pour expliquer le champ
COMMENT ON COLUMN post_comments.replied_to_user_id IS 'ID de l''utilisateur (dans la table profiles) à qui on répond directement — utilisé pour afficher "User A 🔁 User B".';