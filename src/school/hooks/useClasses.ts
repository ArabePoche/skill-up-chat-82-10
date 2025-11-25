// Hook pour la gestion des classes
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CycleType = 'maternel' | 'primaire' | 'collège' | 'lycée' | 'université';
export type GenderType = 'mixte' | 'garçons' | 'filles';

export interface Class {
  id: string;
  school_id: string;
  school_year_id: string;
  name: string;
  cycle: CycleType;
  max_students: number;
  current_students: number;
  gender_type: GenderType;
  annual_fee: number;
  registration_fee: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClassData {
  school_id: string;
  school_year_id: string;
  name: string;
  cycle: CycleType;
  max_students: number;
  gender_type: GenderType;
  annual_fee: number;
  registration_fee: number;
}

// Hook pour récupérer les classes d'une école
export const useSchoolClasses = (schoolId?: string, schoolYearId?: string) => {
  return useQuery({
    queryKey: ['school-classes', schoolId, schoolYearId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const query = supabase
        .from('classes' as any)
        .select('*')
        .eq('school_id', schoolId)
        .order('cycle', { ascending: true })
        .order('name', { ascending: true });
      
      let finalQuery = query;
      if (schoolYearId) {
        finalQuery = query.eq('school_year_id', schoolYearId);
      }
      
      const { data, error } = await finalQuery;
      
      if (error) {
        console.error('Error fetching classes:', error);
        throw error;
      }
      
      return data as unknown as Class[];
    },
    enabled: !!schoolId,
  });
};

// Hook pour créer une ou plusieurs classes
export const useCreateClasses = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (classes: CreateClassData[]) => {
      const { data, error } = await supabase
        .from('classes' as any)
        .insert(classes)
        .select();
      
      if (error) throw error;
      return data as unknown as Class[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ 
          queryKey: ['school-classes', data[0].school_id] 
        });
        toast.success(
          data.length === 1 
            ? 'Classe créée avec succès' 
            : `${data.length} classes créées avec succès`
        );
      }
    },
    onError: (error) => {
      console.error('Error creating classes:', error);
      toast.error('Erreur lors de la création des classes');
    },
  });
};

// Hook pour mettre à jour une classe
export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Class> }) => {
      const { data, error } = await supabase
        .from('classes' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as Class;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['school-classes', data.school_id] 
      });
      toast.success('Classe mise à jour');
    },
    onError: (error) => {
      console.error('Error updating class:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

// Hook pour supprimer une classe
export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('classes' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return schoolId;
    },
    onSuccess: (schoolId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['school-classes', schoolId] 
      });
      toast.success('Classe supprimée');
    },
    onError: (error) => {
      console.error('Error deleting class:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};
