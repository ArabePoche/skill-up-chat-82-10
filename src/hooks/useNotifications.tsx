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
                  .select('id, first_name, last_name, email, username, phone, avatar_url')
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
                .select('id, first_name, last_name, email, username, phone, avatar_url')
                .eq('id', notification.user_id)
                .single();

              const { data: formationData, error: formationError } = await supabase
                .from('formations')
                .select('title, image_url')
                .eq('id', notification.formation_id)
                .single();

              return {
                ...notification,
                user_info: profileError ? null : profileData,
                formation_info: formationError ? null : formationData
              };
            } catch (error) {
              console.error('Error fetching plan change details:', error);
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
    mutationFn: async ({ enrollmentId, action, reason }: {
      enrollmentId: string;
      action: 'approved' | 'rejected';
      reason?: string;
    }) => {
      console.log('Handling enrollment:', { enrollmentId, action, reason });

      const updateData: any = {
        status: action,
        updated_at: new Date().toISOString()
      };

      if (action === 'rejected' && reason) {
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

      console.log('Enrollment updated successfully');
      return { success: true };
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
    handleEnrollment: handleEnrollmentMutation.mutate,
    isHandlingEnrollment: handleEnrollmentMutation.isPending,
    markAsRead: markAsReadMutation.mutate
  };
};
