/**
 * Hook pour gérer le verrouillage des soumissions d'exercices
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LockResult {
  success: boolean;
  message: string;
  error?: string;
  locked_by_name?: string;
}

export const useSubmissionLock = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const lockSubmission = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('lock_exercise_submission', {
        p_message_id: messageId,
        p_teacher_id: user.id
      });

      if (error) throw error;

      // Vérifier le résultat
      const result = data as unknown as LockResult;
      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (data, messageId) => {
      toast.success('Soumission déverrouillée pour traitement');
      
      // Invalider les queries de messages pour rafraîchir l'UI
      queryClient.invalidateQueries({ queryKey: ['teacher-messages'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-messages'] });
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages'] });
    },
    onError: (error: any) => {
      console.error('Error locking submission:', error);
      toast.error(error.message || 'Impossible de verrouiller la soumission');
    }
  });

  const unlockSubmission = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('unlock_exercise_submission', {
        p_message_id: messageId,
        p_teacher_id: user.id
      });

      if (error) throw error;

      // Vérifier le résultat
      const result = data as unknown as LockResult;
      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Soumission déverrouillée');
      
      // Invalider les queries de messages
      queryClient.invalidateQueries({ queryKey: ['teacher-messages'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-messages'] });
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages'] });
    },
    onError: (error: any) => {
      console.error('Error unlocking submission:', error);
      toast.error(error.message || 'Impossible de déverrouiller la soumission');
    }
  });

  return {
    lockSubmission: lockSubmission.mutate,
    unlockSubmission: unlockSubmission.mutate,
    isLocking: lockSubmission.isPending,
    isUnlocking: unlockSubmission.isPending
  };
};
