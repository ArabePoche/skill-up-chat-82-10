/**
 * Hook pour gérer les types d'évaluations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EvaluationType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const useEvaluationTypes = (schoolId?: string) => {
  return useQuery({
    queryKey: ['evaluation-types', schoolId],
    queryFn: async (): Promise<EvaluationType[]> => {
      if (!schoolId) return [];

      // Récupérer les types d'évaluations
      const { data, error } = await supabase
        .from('school_evaluation_types')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
};

export const useCreateEvaluationType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description, schoolId }: { name: string; description?: string; schoolId: string }) => {
      const { data, error } = await supabase
        .from('school_evaluation_types')
        .insert({
          name,
          description: description || null,
          school_id: schoolId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-types', variables.schoolId] });
      toast.success('Type d\'évaluation créé');
    },
    onError: (error) => {
      console.error('Error creating evaluation type:', error);
      toast.error('Erreur lors de la création du type');
    },
  });
};
