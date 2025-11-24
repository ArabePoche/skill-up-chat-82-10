import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import type { Teacher } from '../types';

/**
 * Hook pour récupérer les enseignants d'une école
 */
export const useTeachers = () => {
  const { id: schoolId } = useParams();

  return useQuery({
    queryKey: ['teachers', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_teachers')
        .select(`
          id,
          user_id,
          school_id,
          first_name,
          last_name,
          email,
          phone,
          teacher_type,
          specialties,
          hire_date,
          employment_status,
          application_status,
          created_at,
          updated_at
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformer les données au format Teacher
      return (data || []).map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        school_id: t.school_id,
        type: t.teacher_type || 'specialist',
        specialty: t.specialties?.[0] || undefined,
        is_active: t.employment_status === 'active',
        created_at: t.created_at,
        updated_at: t.updated_at,
        profiles: {
          id: t.user_id,
          first_name: t.first_name,
          last_name: t.last_name,
          email: t.email,
          avatar_url: undefined,
        }
      })) as Teacher[];
    },
    enabled: !!schoolId,
  });
};

/**
 * Hook pour créer un enseignant
 */
export const useCreateTeacher = () => {
  const queryClient = useQueryClient();
  const { id: schoolId } = useParams();

  return useMutation({
    mutationFn: async (data: { 
      user_id: string; 
      first_name: string;
      last_name: string;
      email: string;
      type: 'generalist' | 'specialist'; 
      specialty?: string;
    }) => {
      if (!schoolId) throw new Error('No school selected');

      const { data: teacher, error } = await supabase
        .from('school_teachers')
        .insert({
          school_id: schoolId,
          user_id: data.user_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          teacher_type: data.type,
          specialties: data.specialty ? [data.specialty] : [],
          employment_status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return teacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Enseignant créé avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating teacher:', error);
      toast.error(error.message || 'Erreur lors de la création');
    },
  });
};

/**
 * Hook pour mettre à jour un enseignant
 */
export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, type, specialty }: { id: string; type?: 'generalist' | 'specialist'; specialty?: string }) => {
      const updates: any = {};
      if (type) updates.teacher_type = type;
      if (specialty !== undefined) updates.specialties = specialty ? [specialty] : [];

      const { data, error } = await supabase
        .from('school_teachers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Enseignant mis à jour');
    },
    onError: (error: any) => {
      console.error('Error updating teacher:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });
};

/**
 * Hook pour supprimer un enseignant
 */
export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('school_teachers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Enseignant supprimé');
    },
    onError: (error: any) => {
      console.error('Error deleting teacher:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });
};
