-- Activer RLS sur grade_audit_log
ALTER TABLE grade_audit_log ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre les insertions (via trigger)
CREATE POLICY "allow_insert_grade_audit_log" 
ON grade_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Politique pour permettre la lecture aux utilisateurs authentifiés
CREATE POLICY "allow_select_grade_audit_log" 
ON grade_audit_log 
FOR SELECT 
USING (auth.uid() IS NOT NULL);