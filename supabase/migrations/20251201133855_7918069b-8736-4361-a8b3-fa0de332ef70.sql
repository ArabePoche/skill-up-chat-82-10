-- Renommer evaluation_types en school_evaluation_types et ajouter school_id
ALTER TABLE evaluation_types RENAME TO school_evaluation_types;

ALTER TABLE school_evaluation_types 
ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

-- Créer un index pour school_id
CREATE INDEX idx_school_evaluation_types_school_id ON school_evaluation_types(school_id);

-- Table principale des évaluations scolaires
CREATE TABLE school_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  evaluation_type_id UUID REFERENCES school_evaluation_types(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Table de configuration des classes pour une évaluation
CREATE TABLE school_evaluation_class_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES school_evaluations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  room TEXT,
  location_type TEXT CHECK (location_type IN ('room', 'external')) DEFAULT 'room',
  external_location TEXT,
  evaluation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des matières concernées par classe
CREATE TABLE school_evaluation_class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_config_id UUID NOT NULL REFERENCES school_evaluation_class_configs(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_config_id, subject_id)
);

-- Table des élèves exclus
CREATE TABLE school_evaluation_excluded_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_config_id UUID NOT NULL REFERENCES school_evaluation_class_configs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_config_id, student_id)
);

-- Table des surveillants
CREATE TABLE school_evaluation_supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_config_id UUID NOT NULL REFERENCES school_evaluation_class_configs(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_config_id, supervisor_id)
);

-- Table des questionnaires
CREATE TABLE school_evaluation_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_config_id UUID NOT NULL REFERENCES school_evaluation_class_configs(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT,
  instructions TEXT,
  file_url TEXT,
  total_points NUMERIC NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_config_id, subject_id)
);

-- Indexes pour optimiser les requêtes
CREATE INDEX idx_school_evaluations_school_id ON school_evaluations(school_id);
CREATE INDEX idx_school_evaluations_school_year_id ON school_evaluations(school_year_id);
CREATE INDEX idx_school_evaluation_class_configs_evaluation_id ON school_evaluation_class_configs(evaluation_id);
CREATE INDEX idx_school_evaluation_class_configs_class_id ON school_evaluation_class_configs(class_id);

-- RLS policies pour school_evaluation_types
ALTER TABLE school_evaluation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs peuvent voir les types d'évaluation"
  ON school_evaluation_types FOR SELECT
  USING (
    school_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM schools WHERE schools.id = school_evaluation_types.school_id AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent créer des types d'évaluation"
  ON school_evaluation_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools 
      WHERE schools.id = school_evaluation_types.school_id 
      AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent modifier leurs types d'évaluation"
  ON school_evaluation_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM schools 
      WHERE schools.id = school_evaluation_types.school_id 
      AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent supprimer leurs types d'évaluation"
  ON school_evaluation_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM schools 
      WHERE schools.id = school_evaluation_types.school_id 
      AND schools.owner_id = auth.uid()
    )
  );

-- RLS policies pour school_evaluations
ALTER TABLE school_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs peuvent voir les évaluations de leur école"
  ON school_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM schools WHERE schools.id = school_evaluations.school_id AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent créer des évaluations"
  ON school_evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schools WHERE schools.id = school_evaluations.school_id AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent modifier leurs évaluations"
  ON school_evaluations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM schools WHERE schools.id = school_evaluations.school_id AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent supprimer leurs évaluations"
  ON school_evaluations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM schools WHERE schools.id = school_evaluations.school_id AND schools.owner_id = auth.uid()
    )
  );

-- RLS policies pour les tables de configuration
ALTER TABLE school_evaluation_class_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_evaluation_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_evaluation_excluded_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_evaluation_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_evaluation_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs peuvent voir les configurations"
  ON school_evaluation_class_configs FOR SELECT
  USING (
    evaluation_id IN (
      SELECT id FROM school_evaluations WHERE school_id IN (
        SELECT id FROM schools WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent gérer les configurations"
  ON school_evaluation_class_configs FOR ALL
  USING (
    evaluation_id IN (
      SELECT id FROM school_evaluations WHERE school_id IN (
        SELECT id FROM schools WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent voir les matières"
  ON school_evaluation_class_subjects FOR SELECT
  USING (
    class_config_id IN (
      SELECT id FROM school_evaluation_class_configs WHERE evaluation_id IN (
        SELECT id FROM school_evaluations WHERE school_id IN (
          SELECT id FROM schools WHERE owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent gérer les matières"
  ON school_evaluation_class_subjects FOR ALL
  USING (
    class_config_id IN (
      SELECT id FROM school_evaluation_class_configs WHERE evaluation_id IN (
        SELECT id FROM school_evaluations WHERE school_id IN (
          SELECT id FROM schools WHERE owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent voir les élèves exclus"
  ON school_evaluation_excluded_students FOR SELECT
  USING (
    class_config_id IN (
      SELECT id FROM school_evaluation_class_configs WHERE evaluation_id IN (
        SELECT id FROM school_evaluations WHERE school_id IN (
          SELECT id FROM schools WHERE owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent gérer les élèves exclus"
  ON school_evaluation_excluded_students FOR ALL
  USING (
    class_config_id IN (
      SELECT id FROM school_evaluation_class_configs WHERE evaluation_id IN (
        SELECT id FROM school_evaluations WHERE school_id IN (
          SELECT id FROM schools WHERE owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent voir les surveillants"
  ON school_evaluation_supervisors FOR SELECT
  USING (
    class_config_id IN (
      SELECT id FROM school_evaluation_class_configs WHERE evaluation_id IN (
        SELECT id FROM school_evaluations WHERE school_id IN (
          SELECT id FROM schools WHERE owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent gérer les surveillants"
  ON school_evaluation_supervisors FOR ALL
  USING (
    class_config_id IN (
      SELECT id FROM school_evaluation_class_configs WHERE evaluation_id IN (
        SELECT id FROM school_evaluations WHERE school_id IN (
          SELECT id FROM schools WHERE owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent voir les questionnaires"
  ON school_evaluation_questionnaires FOR SELECT
  USING (
    class_config_id IN (
      SELECT id FROM school_evaluation_class_configs WHERE evaluation_id IN (
        SELECT id FROM school_evaluations WHERE school_id IN (
          SELECT id FROM schools WHERE owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Utilisateurs peuvent gérer les questionnaires"
  ON school_evaluation_questionnaires FOR ALL
  USING (
    class_config_id IN (
      SELECT id FROM school_evaluation_class_configs WHERE evaluation_id IN (
        SELECT id FROM school_evaluations WHERE school_id IN (
          SELECT id FROM schools WHERE owner_id = auth.uid()
        )
      )
    )
  );