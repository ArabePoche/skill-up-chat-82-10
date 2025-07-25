
-- Ajouter le type 'lesson' au enum video_type
ALTER TYPE video_type ADD VALUE IF NOT EXISTS 'lesson';

-- Assurer que les relations existent correctement
-- Ajouter une contrainte unique sur teacher_formations si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'teacher_formations_teacher_formation_unique' 
        AND table_name = 'teacher_formations'
    ) THEN
        ALTER TABLE teacher_formations 
        ADD CONSTRAINT teacher_formations_teacher_formation_unique 
        UNIQUE (teacher_id, formation_id);
    END IF;
END $$;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_teacher_formations_teacher_id ON teacher_formations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_formations_formation_id ON teacher_formations(formation_id);
