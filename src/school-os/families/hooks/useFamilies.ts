// Hook pour gérer les familles d'élèves
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Family {
  id: string;
  school_id: string;
  family_name: string;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFamilyData {
  school_id: string;
  family_name: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  address?: string;
  notes?: string;
}

export const useFamilies = (schoolId?: string) => {
  return useQuery({
    queryKey: ['families', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_student_families')
        .select('*')
        .eq('school_id', schoolId)
        .order('family_name');

      if (error) throw error;
      return data as Family[];
    },
    enabled: !!schoolId,
  });
};

export const useCreateFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (familyData: CreateFamilyData) => {
      const { data, error } = await supabase
        .from('school_student_families')
        .insert(familyData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['families', data.school_id] });
      toast.success('Famille créée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création de la famille');
    },
  });
};

export const useUpdateFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Family> & { id: string }) => {
      const { data, error } = await supabase
        .from('school_student_families')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['families', data.school_id] });
      toast.success('Famille mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

export const useDeleteFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('school_student_families')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      queryClient.invalidateQueries({ queryKey: ['families', schoolId] });
      toast.success('Famille supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
};

export const useLinkStudentToFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, familyId }: { studentId: string; familyId: string | null }) => {
      const { data, error } = await supabase
        .from('students_school')
        .update({ family_id: familyId })
        .eq('id', studentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success(data.family_id ? 'Élève lié à la famille' : 'Élève délié de la famille');
    },
    onError: () => {
      toast.error('Erreur lors de la liaison');
    },
  });
};

// Hook pour récupérer les frères/sœurs d'un élève
export const useFamilySiblings = (familyId?: string | null, currentStudentId?: string) => {
  return useQuery({
    queryKey: ['family-siblings', familyId, currentStudentId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('students_school')
        .select('*, classes(name, cycle)')
        .eq('family_id', familyId)
        .neq('id', currentStudentId || '')
        .order('date_of_birth');

      if (error) throw error;
      return data;
    },
    enabled: !!familyId,
  });
};
 