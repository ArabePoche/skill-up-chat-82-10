import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook pour envoyer une demande d'adhésion à une école
 */
export const useSchoolJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      schoolId: string; 
      userId: string; 
      role: string;
      formData?: any;
    }) => {
      const { error } = await supabase
        .from('school_join_requests')
        .insert({
          school_id: data.schoolId,
          user_id: data.userId,
          role: data.role,
          form_data: data.formData,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-schools'] });
      toast.success('Demande envoyée avec succès');
    },
    onError: (error) => {
      console.error('Error sending join request:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    },
  });
};
