/**
 * Hook pour gérer les évaluations scolaires
 * Utilise la table school_evaluations et ses tables de configuration
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface EvaluationData {
  id?: string;
  title: string;
  description?: string;
  evaluation_type_id: string;
  school_id: string;
  school_year_id: string;
  max_score?: number;
  coefficient?: number;
  include_in_average?: boolean;
  evaluation_date?: string;
  classes_config: ClassConfig[];
}

export interface SubjectSchedule {
  subject_id: string;
  evaluation_date: string;
  start_time: string;
  end_time: string;
}

export interface ClassConfig {
  class_id: string;
  subjects: string[]; // subject_ids
  subject_schedules: SubjectSchedule[]; // planning par matière
  excluded_students: string[];
  supervisors: string[];
  room: string;
  location_type: 'room' | 'external';
  external_location?: string;
  date: string;
  start_time: string;
  end_time: string;
  questionnaires: QuestionnaireData[];
}

export interface QuestionnaireData {
  subject_id: string;
  title?: string;
  instructions?: string;
  file_url?: string;
  total_points: number;
}

export const useEvaluations = (schoolId?: string, schoolYearId?: string) => {
  return useQuery({
    queryKey: ['school-evaluations', schoolId, schoolYearId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Récupérer les évaluations avec les relations
      let query = supabase
        .from('school_evaluations')
        .select(`
          id,
          title,
          description,
          evaluation_type_id,
          evaluation_date,
          max_score,
          coefficient,
          include_in_average,
          school_id,
          school_year_id,
          created_at,
          created_by,
          school_evaluation_types(id, name),
          school_evaluation_class_configs(
            id,
            class_id,
            room,
            location_type,
            external_location,
            evaluation_date,
            start_time,
            end_time,
            classes(id, name),
            school_evaluation_class_subjects(
              id,
              subject_id,
              subjects(id, name)
            ),
            school_evaluation_excluded_students(student_id),
            school_evaluation_supervisors(supervisor_id)
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (schoolYearId) {
        query = query.eq('school_year_id', schoolYearId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching school evaluations:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!schoolId,
  });
};

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: EvaluationData) => {
      console.log('📝 Creating school evaluation with data:', data);

      // 1. Créer l'évaluation principale dans school_evaluations
      const evaluationData = {
        title: data.title,
        description: data.description || null,
        evaluation_type_id: data.evaluation_type_id,
        school_id: data.school_id,
        school_year_id: data.school_year_id,
        max_score: data.max_score || 20,
        coefficient: data.coefficient || 1,
        include_in_average: data.include_in_average ?? true,
        evaluation_date: data.evaluation_date || (data.classes_config[0]?.date || null),
        created_by: user?.id || null,
      };

      console.log('📝 Inserting school evaluation:', evaluationData);

      const { data: evaluation, error: evalError } = await supabase
        .from('school_evaluations')
        .insert(evaluationData)
        .select()
        .single();

      if (evalError) {
        console.error('❌ Error creating school evaluation:', evalError);
        throw evalError;
      }

      console.log('✅ School evaluation created:', evaluation);

      // 2. Créer les configurations par classe
      for (const classConfig of data.classes_config) {
        const configData = {
          evaluation_id: evaluation.id,
          class_id: classConfig.class_id,
          room: classConfig.room || null,
          location_type: classConfig.location_type || 'room',
          external_location: classConfig.external_location || null,
          evaluation_date: classConfig.date || null,
          start_time: classConfig.start_time || null,
          end_time: classConfig.end_time || null,
        };

        const { data: config, error: configError } = await supabase
          .from('school_evaluation_class_configs')
          .insert(configData)
          .select()
          .single();

        if (configError) {
          console.error('❌ Error creating class config:', configError);
          continue;
        }

        console.log('✅ Class config created:', config);

        // 3. Ajouter les matières pour cette classe avec leur planning
        if (classConfig.subjects && classConfig.subjects.length > 0) {
          const subjectsData = classConfig.subjects.map(subjectId => {
            // Chercher le planning de cette matière
            const schedule = classConfig.subject_schedules?.find(s => s.subject_id === subjectId);
            return {
              class_config_id: config.id,
              subject_id: subjectId,
              evaluation_date: schedule?.evaluation_date || null,
              start_time: schedule?.start_time || null,
              end_time: schedule?.end_time || null,
            };
          });

          const { error: subjectsError } = await supabase
            .from('school_evaluation_class_subjects')
            .insert(subjectsData);

          if (subjectsError) {
            console.error('❌ Error creating class subjects:', subjectsError);
          }
        }

        // 4. Ajouter les élèves exclus
        if (classConfig.excluded_students && classConfig.excluded_students.length > 0) {
          const excludedData = classConfig.excluded_students.map(studentId => ({
            class_config_id: config.id,
            student_id: studentId,
          }));

          const { error: excludedError } = await supabase
            .from('school_evaluation_excluded_students')
            .insert(excludedData);

          if (excludedError) {
            console.error('❌ Error creating excluded students:', excludedError);
          }
        }

        // 5. Ajouter les surveillants
        if (classConfig.supervisors && classConfig.supervisors.length > 0) {
          const supervisorsData = classConfig.supervisors.map(supervisorId => ({
            class_config_id: config.id,
            supervisor_id: supervisorId,
          }));

          const { error: supervisorsError } = await supabase
            .from('school_evaluation_supervisors')
            .insert(supervisorsData);

          if (supervisorsError) {
            console.error('❌ Error creating supervisors:', supervisorsError);
          }
        }

        // 6. Ajouter les questionnaires
        if (classConfig.questionnaires && classConfig.questionnaires.length > 0) {
          const questionnairesData = classConfig.questionnaires.map(q => ({
            class_config_id: config.id,
            subject_id: q.subject_id,
            title: q.title || null,
            instructions: q.instructions || null,
            file_url: q.file_url || null,
            total_points: q.total_points,
          }));

          const { error: questionnairesError } = await supabase
            .from('school_evaluation_questionnaires')
            .insert(questionnairesData);

          if (questionnairesError) {
            console.error('❌ Error creating questionnaires:', questionnairesError);
          }
        }
      }

      return evaluation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-evaluations'] });
      toast.success('Évaluation créée avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating evaluation:', error);
      toast.error(`Erreur lors de la création: ${error.message || 'Erreur inconnue'}`);
    },
  });
};

export const useUpdateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EvaluationData> }) => {
      console.log('📝 Updating school evaluation:', id, data);

      const updateData: any = {};
      
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.evaluation_type_id) updateData.evaluation_type_id = data.evaluation_type_id;
      if (data.max_score !== undefined) updateData.max_score = data.max_score;
      if (data.coefficient !== undefined) updateData.coefficient = data.coefficient;
      if (data.include_in_average !== undefined) updateData.include_in_average = data.include_in_average;
      if (data.evaluation_date) updateData.evaluation_date = data.evaluation_date;

      // Si on a une config de classe, mettre à jour la date
      if (data.classes_config && data.classes_config.length > 0) {
        const firstConfig = data.classes_config[0];
        if (firstConfig.date) updateData.evaluation_date = firstConfig.date;
      }

      const { data: result, error } = await supabase
        .from('school_evaluations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating school evaluation:', error);
        throw error;
      }

      console.log('✅ School evaluation updated:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-evaluations'] });
      toast.success('Évaluation mise à jour');
    },
    onError: (error: any) => {
      console.error('Error updating evaluation:', error);
      toast.error(`Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}`);
    },
  });
};

export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Deleting school evaluation:', id);

      const { error } = await supabase
        .from('school_evaluations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting school evaluation:', error);
        throw error;
      }

      console.log('✅ School evaluation deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-evaluations'] });
      toast.success('Évaluation supprimée');
    },
    onError: (error: any) => {
      console.error('Error deleting evaluation:', error);
      toast.error(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
    },
  });
};
