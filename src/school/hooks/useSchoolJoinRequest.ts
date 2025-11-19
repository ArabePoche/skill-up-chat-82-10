import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook pour envoyer une demande d'adhésion à une école
 * Note: Utilise notifications temporairement en attendant la table school_join_requests
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
      // Pour l'instant, on stocke dans notifications en attendant la vraie table
      const formDataString = data.formData ? JSON.stringify(data.formData) : '';
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: 'Demande d\'adhésion',
          message: `Nouvelle demande (Rôle: ${data.role}) - École: ${data.schoolId}\n${formDataString}`,
          type: 'school_join_request',
          user_id: data.userId,
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
