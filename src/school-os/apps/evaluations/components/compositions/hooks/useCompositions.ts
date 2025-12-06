/**
 * Hook pour gérer les compositions et examens officiels
 * Utilise les tables school_compositions et tables associées
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Composition, CreateCompositionData, CompositionWithRelations } from '../types';

export const useCompositions = (schoolId?: string, schoolYearId?: string) => {
  return useQuery({
    queryKey: ['school-compositions', schoolId, schoolYearId],
    queryFn: async () => {
      if (!schoolId) return [];

      let query = supabase
        .from('school_compositions')
        .select(`
          *,
          school_composition_classes(id, class_id, classes(id, name)),
          school_composition_excluded_students(id, student_id),
          school_composition_excluded_subjects(id, class_id, subject_id)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (schoolYearId) {
        query = query.eq('school_year_id', schoolYearId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching compositions:', error);
        throw error;
      }

      return (data || []) as CompositionWithRelations[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateComposition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      schoolId,
      schoolYearId,
      data,
    }: {
      schoolId: string;
      schoolYearId: string;
      data: CreateCompositionData;
    }) => {
      console.log('📝 Creating composition:', data);

      // 1. Créer la composition
      const { data: composition, error: compError } = await supabase
        .from('school_compositions')
        .insert({
          school_id: schoolId,
          school_year_id: schoolYearId,
          title: data.title,
          type: data.type,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          include_class_notes: data.include_class_notes ?? false,
        })
        .select()
        .single();

      if (compError) {
        console.error('❌ Error creating composition:', compError);
        throw compError;
      }

      // 2. Ajouter les classes associées
      if (data.class_ids.length > 0) {
        const classesData = data.class_ids.map(classId => ({
          composition_id: composition.id,
          class_id: classId,
        }));

        const { error: classesError } = await supabase
          .from('school_composition_classes')
          .insert(classesData);

        if (classesError) {
          console.error('❌ Error adding classes:', classesError);
        }
      }

      // 3. Ajouter les matières exclues
      if (data.excluded_subjects.length > 0) {
        const excludedSubjectsData = data.excluded_subjects.map(item => ({
          composition_id: composition.id,
          class_id: item.class_id,
          subject_id: item.subject_id,
        }));

        const { error: subjectsError } = await supabase
          .from('school_composition_excluded_subjects')
          .insert(excludedSubjectsData);

        if (subjectsError) {
          console.error('❌ Error adding excluded subjects:', subjectsError);
        }
      }

      // 4. Ajouter les élèves exclus
      if (data.excluded_students.length > 0) {
        const excludedStudentsData = data.excluded_students.map(studentId => ({
          composition_id: composition.id,
          student_id: studentId,
        }));

        const { error: studentsError } = await supabase
          .from('school_composition_excluded_students')
          .insert(excludedStudentsData);

        if (studentsError) {
          console.error('❌ Error adding excluded students:', studentsError);
        }
      }

      return composition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-compositions'] });
      toast.success('Composition créée avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating composition:', error);
      toast.error(`Erreur: ${error.message || 'Erreur inconnue'}`);
    },
  });
};

export const useUpdateComposition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCompositionData>;
    }) => {
      console.log('📝 Updating composition:', id, data);

      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.type) updateData.type = data.type;
      if (data.start_date !== undefined) updateData.start_date = data.start_date;
      if (data.end_date !== undefined) updateData.end_date = data.end_date;
      if (data.include_class_notes !== undefined) updateData.include_class_notes = data.include_class_notes;

      const { data: result, error } = await supabase
        .from('school_compositions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating composition:', error);
        throw error;
      }

      // Si les classes ont changé, mettre à jour
      if (data.class_ids) {
        // Supprimer les anciennes classes
        await supabase
          .from('school_composition_classes')
          .delete()
          .eq('composition_id', id);

        // Ajouter les nouvelles
        if (data.class_ids.length > 0) {
          const classesData = data.class_ids.map(classId => ({
            composition_id: id,
            class_id: classId,
          }));

          await supabase
            .from('school_composition_classes')
            .insert(classesData);
        }
      }

      // Si les matières exclues ont changé
      if (data.excluded_subjects) {
        await supabase
          .from('school_composition_excluded_subjects')
          .delete()
          .eq('composition_id', id);

        if (data.excluded_subjects.length > 0) {
          const excludedSubjectsData = data.excluded_subjects.map(item => ({
            composition_id: id,
            class_id: item.class_id,
            subject_id: item.subject_id,
          }));

          await supabase
            .from('school_composition_excluded_subjects')
            .insert(excludedSubjectsData);
        }
      }

      // Si les élèves exclus ont changé
      if (data.excluded_students) {
        await supabase
          .from('school_composition_excluded_students')
          .delete()
          .eq('composition_id', id);

        if (data.excluded_students.length > 0) {
          const excludedStudentsData = data.excluded_students.map(studentId => ({
            composition_id: id,
            student_id: studentId,
          }));

          await supabase
            .from('school_composition_excluded_students')
            .insert(excludedStudentsData);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-compositions'] });
      toast.success('Composition mise à jour');
    },
    onError: (error: any) => {
      console.error('Error updating composition:', error);
      toast.error(`Erreur: ${error.message || 'Erreur inconnue'}`);
    },
  });
};

export const useDeleteComposition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Deleting composition:', id);

      const { error } = await supabase
        .from('school_compositions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting composition:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-compositions'] });
      toast.success('Composition supprimée');
    },
    onError: (error: any) => {
      console.error('Error deleting composition:', error);
      toast.error(`Erreur: ${error.message || 'Erreur inconnue'}`);
    },
  });
};
