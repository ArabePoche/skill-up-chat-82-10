-- Ajouter subject_id à school_teacher_classes pour lier aux matières
ALTER TABLE school_teacher_classes
ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX idx_school_teacher_classes_subject_id ON school_teacher_classes(subject_id);

-- Commentaire pour expliquer l'utilisation
COMMENT ON COLUMN school_teacher_classes.subject_id IS 'Référence à la matière enseignée. NULL = professeur principal de classe';
COMMENT ON COLUMN school_teacher_classes.subject IS 'Nom de la matière (legacy, utiliser subject_id à la place)';