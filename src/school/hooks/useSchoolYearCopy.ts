// Hooks pour copier les données d'une année scolaire vers une nouvelle année
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Copie les classes d'une année scolaire source vers une année cible
 */
export const useCopyClasses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      schoolId: string;
      sourceYearId: string;
      targetYearId: string;
      selectedClassIds?: string[];
    }) => {
      const { schoolId, sourceYearId, targetYearId, selectedClassIds } = params;

      // Récupérer les classes de l'année source
      const { data: sourceClasses, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId)
        .eq('school_year_id', sourceYearId);

      if (fetchError) throw fetchError;
      if (!sourceClasses || sourceClasses.length === 0) {
        return { copied: 0, message: 'Aucune classe à copier' };
      }

      // Filtrer les classes si une sélection est fournie
      const classesToCopy = selectedClassIds && selectedClassIds.length > 0
        ? sourceClasses.filter((cls: any) => selectedClassIds.includes(cls.id))
        : sourceClasses;

      if (classesToCopy.length === 0) {
        return { copied: 0, message: 'Aucune classe sélectionnée' };
      }

      // Créer les nouvelles classes pour l'année cible
      const newClasses = classesToCopy.map((cls: any) => ({
        school_id: schoolId,
        school_year_id: targetYearId,
        name: cls.name,
        cycle: cls.cycle,
        max_students: cls.max_students,
        current_students: 0,
        gender_type: cls.gender_type,
        annual_fee: cls.annual_fee,
        registration_fee: cls.registration_fee,
        grade_order: cls.grade_order || 0,
      }));

      const { data: created, error: insertError } = await supabase
        .from('classes')
        .insert(newClasses)
        .select();

      if (insertError) throw insertError;

      return { copied: created?.length || 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['school-classes'] });
      toast.success(`${result.copied} classe(s) copiée(s) avec succès`);
    },
    onError: (error: any) => {
      console.error('Error copying classes:', error);
      toast.error('Erreur lors de la copie des classes: ' + (error?.message || 'inconnue'));
    },
  });
};

/**
 * Copie les matières d'une année scolaire source vers une année cible
 * Note: Les matières sont généralement partagées entre les années (school_id),
 * mais si vous voulez copier les associations classe-matière (class_subjects),
 * utilisez useCopyClassSubjects
 */
export const useCopyClassSubjects = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      schoolId: string;
      sourceYearId: string;
      targetYearId: string;
      selectedClassIds?: string[];
      selectedSubjectIds?: string[];
  }) => {
      const { schoolId, sourceYearId, targetYearId, selectedClassIds, selectedSubjectIds } = params;

      // Récupérer les classes de l'année source et cible
      const { data: sourceClasses, error: sourceError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('school_year_id', sourceYearId);

      const { data: targetClasses, error: targetError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('school_year_id', targetYearId);

      if (sourceError) throw sourceError;
      if (targetError) throw targetError;
      if (!sourceClasses || !targetClasses || sourceClasses.length === 0) {
        return { copied: 0, message: 'Aucune classe trouvée' };
      }

      // Filtrer les classes source si une sélection est fournie
      const filteredSourceClasses = selectedClassIds && selectedClassIds.length > 0
        ? sourceClasses.filter((sc: any) => selectedClassIds.includes(sc.id))
        : sourceClasses;

      if (filteredSourceClasses.length === 0) {
        return { copied: 0, message: 'Aucune classe sélectionnée' };
      }

      // Créer un mapping nom -> id pour les classes cibles
      const targetClassMap = new Map(
        targetClasses.map((tc: any) => [tc.name, tc.id])
      );

      // Récupérer les associations classe-matière de l'année source
      const sourceClassIds = filteredSourceClasses.map((sc: any) => sc.id);
      const { data: classSubjects, error: csError } = await supabase
        .from('class_subjects')
        .select('*')
        .in('class_id', sourceClassIds);

      if (csError) throw csError;
      if (!classSubjects || classSubjects.length === 0) {
        return { copied: 0, message: 'Aucune matière à copier' };
      }

      // Filtrer par matières si une sélection est fournie
      const filteredClassSubjects = selectedSubjectIds && selectedSubjectIds.length > 0
        ? classSubjects.filter((cs: any) => selectedSubjectIds.includes(cs.subject_id))
        : classSubjects;

      if (filteredClassSubjects.length === 0) {
        return { copied: 0, message: 'Aucune matière sélectionnée' };
      }

      // Récupérer les noms des classes source
      const sourceClassMap = new Map(
        filteredSourceClasses.map((sc: any) => [sc.id, sc.name])
      );

      // Créer les nouvelles associations pour les classes cibles
      const newClassSubjects: any[] = [];
      for (const cs of filteredClassSubjects) {
        const sourceClassName = sourceClassMap.get(cs.class_id);
        const targetClassId = targetClassMap.get(sourceClassName);
        
        if (targetClassId) {
          newClassSubjects.push({
            class_id: targetClassId,
            subject_id: cs.subject_id,
            coefficient: cs.coefficient,
            max_score: cs.max_score,
            teacher_id: cs.teacher_id,
          });
        }
      }

      if (newClassSubjects.length === 0) {
        return { copied: 0, message: 'Aucune association copiée (classes non correspondantes)' };
      }

      const { data: created, error: insertError } = await supabase
        .from('class_subjects')
        .insert(newClassSubjects)
        .select();

      if (insertError) throw insertError;

      return { copied: created?.length || 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
      toast.success(`${result.copied} association(s) classe-matière copiée(s) avec succès`);
    },
    onError: (error: any) => {
      console.error('Error copying class subjects:', error);
      toast.error('Erreur lors de la copie des matières: ' + (error?.message || 'inconnue'));
    },
  });
};

/**
 * Copie à la fois les classes et les associations classe-matière
 */
export const useCopySchoolYearData = () => {
  const copyClasses = useCopyClasses();
  const copyClassSubjects = useCopyClassSubjects();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      schoolId: string;
      sourceYearId: string;
      targetYearId: string;
      copyClasses: boolean;
      copySubjects: boolean;
      selectedClassIds?: string[];
      selectedSubjectIds?: string[];
    }) => {
      const { schoolId, sourceYearId, targetYearId, copyClasses: shouldCopyClasses, copySubjects: shouldCopySubjects, selectedClassIds, selectedSubjectIds } = params;

      let classesCopied = 0;
      let subjectsCopied = 0;

      if (shouldCopyClasses) {
        const result = await copyClasses.mutateAsync({ schoolId, sourceYearId, targetYearId, selectedClassIds });
        classesCopied = result.copied;
      }

      if (shouldCopySubjects && classesCopied > 0) {
        const result = await copyClassSubjects.mutateAsync({ schoolId, sourceYearId, targetYearId, selectedClassIds, selectedSubjectIds });
        subjectsCopied = result.copied;
      }

      return { classesCopied, subjectsCopied };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['school-classes'] });
      queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
      toast.success(
        `Données copiées: ${result.classesCopied} classe(s), ${result.subjectsCopied} association(s) matière`
      );
    },
    onError: (error: any) => {
      console.error('Error copying school year data:', error);
      toast.error('Erreur lors de la copie des données');
    },
  });
};
