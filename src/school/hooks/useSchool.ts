import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export type SchoolType = 'virtual' | 'physical' | 'both';

export interface School {
  id: string;
  name: string;
  description: string | null;
  school_type: SchoolType;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolYear {
  id: string;
  school_id: string;
  year_label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Hook pour récupérer l'école de l'utilisateur
export const useUserSchool = (userId?: string) => {
  return useQuery({
    queryKey: ['user-school', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('owner_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching school:', error);
        throw error;
      }
      
      return data as School | null;
    },
    enabled: !!userId,
  });
};

// Hook pour récupérer les années scolaires d'une école
export const useSchoolYears = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-years', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('school_years')
        .select('*')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching school years:', error);
        throw error;
      }
      
      return data as SchoolYear[];
    },
    enabled: !!schoolId,
  });
};

// Hook pour récupérer l'année scolaire courante
export const useCurrentSchoolYear = (schoolId?: string) => {
  return useQuery({
    queryKey: ['current-school-year', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      
      const { data, error } = await supabase
        .from('school_years' as any)
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_current', true)
        .single();
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!schoolId,
  });
};

// Hook pour créer une école
export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; schoolType: SchoolType; userId: string }) => {
      const { data: school, error } = await supabase
        .from('schools')
        .insert({
          name: data.name,
          description: data.description,
          school_type: data.schoolType,
          owner_id: data.userId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return school as School;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-school', variables.userId] });
      toast.success('École créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating school:', error);
      toast.error('Erreur lors de la création de l\'école');
    },
  });
};

// Hook pour créer une année scolaire
export const useCreateSchoolYear = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      school_id: string;
      year_label: string;
      start_date: string;
      end_date: string;
    }) => {
      const { data: schoolYear, error } = await supabase
        .from('school_years')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return schoolYear as SchoolYear;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['school-years', data.school_id] });
      toast.success('Année scolaire créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating school year:', error);
      toast.error('Erreur lors de la création de l\'année scolaire');
    },
  });
};

// Hook pour mettre à jour l'année scolaire active
export const useUpdateSchoolYear = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { id: string; school_id: string; is_active: boolean }) => {
      const { data: schoolYear, error } = await supabase
        .from('school_years')
        .update({ is_active: data.is_active })
        .eq('id', data.id)
        .select()
        .single();
      
      if (error) throw error;
      return schoolYear as SchoolYear;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['school-years', data.school_id] });
      toast.success('Année scolaire mise à jour');
    },
    onError: (error) => {
      console.error('Error updating school year:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};
