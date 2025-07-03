
-- Mettre à jour l'énumération du champ type dans la table videos
ALTER TYPE video_type RENAME TO video_type_old;
CREATE TYPE video_type AS ENUM ('lesson', 'promo', 'classic');
ALTER TABLE videos ALTER COLUMN type TYPE video_type USING type::text::video_type;
DROP TYPE video_type_old;

-- Créer un trigger pour mettre à jour automatiquement students_count quand un élève est approuvé
CREATE OR REPLACE FUNCTION update_formation_students_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Si une inscription passe à 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE formations 
    SET students_count = students_count + 1 
    WHERE id = NEW.formation_id;
  END IF;
  
  -- Si une inscription approuvée est rejetée ou supprimée
  IF OLD.status = 'approved' AND (NEW.status != 'approved' OR NEW.status IS NULL) THEN
    UPDATE formations 
    SET students_count = GREATEST(0, students_count - 1) 
    WHERE id = OLD.formation_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur enrollment_requests
DROP TRIGGER IF EXISTS trigger_update_formation_students_count ON enrollment_requests;
CREATE TRIGGER trigger_update_formation_students_count
  AFTER UPDATE OR DELETE ON enrollment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_formation_students_count();
