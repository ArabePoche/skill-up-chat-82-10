import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SchoolType } from './useSchool';

/**
 * Hook pour mettre à jour les informations d'une école
 * Permet de modifier le nom, la description et le type d'école
 */
export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      id: string; 
      name?: string; 
      description?: string; 
      schoolType?: SchoolType;
    }) => {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.schoolType !== undefined) updateData.school_type = data.schoolType;
      
      const { data: school, error } = await supabase
        .from('schools')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();
      
      if (error) throw error;
      return school;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-school'] });
      toast.success('École mise à jour avec succès');
    },
    onError: (error) => {
      console.error('Error updating school:', error);
      toast.error('Erreur lors de la mise à jour de l\'école');
    },
  });
};
