import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Hook pour les actions sur les notifications (marquer comme lu, traiter les demandes)
 */
export const useNotificationActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleEnrollmentMutation = useMutation({
    mutationFn: async ({ 
      enrollmentId, 
      action, 
      reason, 
      planType, 
      promotionId 
    }: {
      enrollmentId: string;
      action: 'approved' | 'rejected';
      reason?: string;
      planType?: 'free' | 'standard' | 'premium' | 'groupe';
      promotionId?: string;
    }) => {
      if (action === 'approved') {
        const { data, error } = await supabase
          .rpc('approve_enrollment_with_promotion', {
            p_enrollment_id: enrollmentId,
            p_admin_id: user?.id,
            p_plan_type: planType || 'free',
            p_promotion_id: promotionId || null
          });

        if (error) throw error;

        const result = data as { success: boolean; error?: string };
        if (!result?.success) {
          throw new Error(result?.error || 'Erreur lors de l\'approbation');
        }

        return result;
      } else {
        const updateData: any = {
          status: action,
          decided_by: user?.id,
          updated_at: new Date().toISOString()
        };

        if (reason) {
          updateData.rejected_reason = reason;
        }

        const { error } = await supabase
          .from('enrollment_requests')
          .update(updateData)
          .eq('id', enrollmentId);

        if (error) throw error;
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Demande traitée avec succès');
    },
    onError: (error) => {
      console.error('Error handling enrollment:', error);
      toast.error('Erreur lors du traitement');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-notifications'] });
    }
  });

  return {
    handleEnrollment: (params: Parameters<typeof handleEnrollmentMutation.mutate>[0]) => 
      handleEnrollmentMutation.mutate(params),
    isHandlingEnrollment: handleEnrollmentMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
  };
};
