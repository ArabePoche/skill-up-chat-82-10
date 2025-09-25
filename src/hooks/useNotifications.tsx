import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Récupérer les notifications
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},is_for_all_admins.eq.true`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      if (!notificationsData) return [];

      // Enrichir les notifications avec les informations utilisateur et formation
      const enrichedNotifications = await Promise.all(
        notificationsData.map(async (notification) => {
          // Pour les notifications d'inscription
          if (notification.enrollment_id && notification.is_for_all_admins) {
            try {
              const { data: enrollmentData, error: enrollmentError } = await supabase
                .from('enrollment_requests')
                .select('user_id, formation_id')
                .eq('id', notification.enrollment_id)
                .single();

              if (!enrollmentError && enrollmentData) {
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('id, first_name, last_name, email, username, phone, avatar_url, country')
                  .eq('id', enrollmentData.user_id)
                  .single();

                const { data: formationData, error: formationError } = await supabase
                  .from('formations')
                  .select('title, image_url')
                  .eq('id', enrollmentData.formation_id)
                  .single();

                return {
                  ...notification,
                  user_info: profileError ? null : profileData,
                  formation_info: formationError ? null : formationData
                };
              }
            } catch (error) {
              console.error('Error fetching enrollment details:', error);
            }
          }

          // Pour les notifications de changement de plan
          if (notification.type === 'plan_change_request' && notification.user_id && notification.formation_id) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, username, phone, avatar_url, country')
                .eq('id', notification.user_id)
                .single();

              const { data: formationData, error: formationError } = await supabase
                .from('formations')
                .select('title, image_url')
                .eq('id', notification.formation_id)
                .single();

              // Récupérer les infos de l'admin qui a approuvé si applicable
              let adminData = null;
              if (notification.subscription_approved_by) {
                const { data: approvedByData, error: approvedByError } = await supabase
                  .from('profiles')
                  .select('first_name, last_name')
                  .eq('id', notification.subscription_approved_by)
                  .single();
                
                if (!approvedByError && approvedByData) {
                  adminData = approvedByData;
                }
              }

              return {
                ...notification,
                user_info: profileError ? null : profileData,
                formation_info: formationError ? null : formationData,
                subscription_approved_by_admin: adminData
              };
            } catch (error) {
              console.error('Error fetching plan change details:', error);
            }
          }

          // Pour les notifications de demande de paiement manuel
          if (notification.type === 'payment_request' && notification.user_id && notification.formation_id) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, username, phone, avatar_url, country')
                .eq('id', notification.user_id)
                .single();

              const { data: formationData, error: formationError } = await supabase
                .from('formations')
                .select('title, image_url')
                .eq('id', notification.formation_id)
                .single();

              // Chercher si la demande de paiement a été traitée et par qui
              let approvedByAdmin = null;
              if (notification.order_id) {
                const { data: paymentData, error: paymentError } = await supabase
                  .from('student_payment')
                  .select('created_by, status')
                  .eq('id', notification.order_id)
                  .single();

                if (!paymentError && paymentData?.created_by && paymentData?.status === 'processed') {
                  const { data: adminData, error: adminError } = await supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', paymentData.created_by)
                    .single();
                  
                  if (!adminError && adminData) {
                    approvedByAdmin = adminData;
                  }
                }
              }

              return {
                ...notification,
                user_info: profileError ? null : profileData,
                formation_info: formationError ? null : formationData,
                approved_by_admin: approvedByAdmin
              };
            } catch (error) {
              console.error('Error fetching payment request details:', error);
            }
          }

          return notification;
        })
      );

      return enrichedNotifications;
    },
    enabled: !!user?.id,
  });

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
        // Utiliser la nouvelle fonction d'approbation avec promotion
        const { data, error } = await supabase
          .rpc('approve_enrollment_with_promotion', {
            p_enrollment_id: enrollmentId,
            p_admin_id: user?.id,
            p_plan_type: planType || 'free',
            p_promotion_id: promotionId || null
          });

        if (error) {
          console.error('Error approving enrollment:', error);
          throw error;
        }

        const result = data as { success: boolean; error?: string; enrollment_id?: string; user_id?: string; formation_id?: string; promotion_id?: string; first_lesson_id?: string };
        
        if (!result?.success) {
          throw new Error(result?.error || 'Erreur lors de l\'approbation');
        }

        console.log('Enrollment approved successfully:', result);
        return result;
      } else {
        // Pour les rejets, utiliser l'ancienne méthode
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

        if (error) {
          console.error('Error updating enrollment:', error);
          throw error;
        }

        console.log('Enrollment rejected successfully');
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollment-requests'] });
      toast.success('Demande d\'inscription traitée avec succès');
    },
    onError: (error) => {
      console.error('Error handling enrollment:', error);
      toast.error('Erreur lors du traitement de la demande');
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    notifications,
    isLoading,
    handleEnrollment: (params: { 
      enrollmentId: string; 
      action: 'approved' | 'rejected'; 
      reason?: string;
      planType?: 'free' | 'standard' | 'premium' | 'groupe';
      promotionId?: string;
    }) => handleEnrollmentMutation.mutate(params),
    isHandlingEnrollment: handleEnrollmentMutation.isPending,
    markAsRead: markAsReadMutation.mutate
  };
};
