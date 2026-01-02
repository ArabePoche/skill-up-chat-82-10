// Hook pour la gestion des cycles scolaires
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SchoolCycle {
  id: string;
  school_id: string;
  name: string;
  label: string;
  grade_base: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Hook pour récupérer les cycles d'une école
export const useSchoolCycles = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-cycles', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('school_cycles' as any)
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) {
        console.error('Error fetching school cycles:', error);
        throw error;
      }
      
      return data as unknown as SchoolCycle[];
    },
    enabled: !!schoolId,
  });
};

// Hook pour récupérer un cycle par son nom
export const useSchoolCycleByName = (schoolId?: string, cycleName?: string) => {
  return useQuery({
    queryKey: ['school-cycle', schoolId, cycleName],
    queryFn: async () => {
      if (!schoolId || !cycleName) return null;
      
      const { data, error } = await supabase
        .from('school_cycles' as any)
        .select('*')
        .eq('school_id', schoolId)
        .eq('name', cycleName)
        .single();
      
      if (error) {
        console.error('Error fetching school cycle:', error);
        return null;
      }
      
      return data as unknown as SchoolCycle;
    },
    enabled: !!schoolId && !!cycleName,
  });
};

// Hook pour mettre à jour un cycle
export const useUpdateSchoolCycle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SchoolCycle> }) => {
      const { data, error } = await supabase
        .from('school_cycles' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as SchoolCycle;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['school-cycles', data.school_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['school-cycle', data.school_id, data.name] 
      });
      toast.success('Cycle mis à jour');
    },
    onError: (error) => {
      console.error('Error updating school cycle:', error);
      toast.error('Erreur lors de la mise à jour du cycle');
    },
  });
};

// Hook pour créer un nouveau cycle
export const useCreateSchoolCycle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cycle: Omit<SchoolCycle, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('school_cycles' as any)
        .insert(cycle)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as SchoolCycle;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['school-cycles', data.school_id] 
      });
      toast.success('Cycle créé');
    },
    onError: (error) => {
      console.error('Error creating school cycle:', error);
      toast.error('Erreur lors de la création du cycle');
    },
  });
};

// Hook pour supprimer (désactiver) un cycle
export const useDeleteSchoolCycle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('school_cycles' as any)
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
      return schoolId;
    },
    onSuccess: (schoolId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['school-cycles', schoolId] 
      });
      toast.success('Cycle supprimé');
    },
    onError: (error) => {
      console.error('Error deleting school cycle:', error);
      toast.error('Erreur lors de la suppression du cycle');
    },
  });
};
