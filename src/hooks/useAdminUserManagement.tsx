
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAdminUserManagement = () => {
  const queryClient = useQueryClient();

  // Récupérer toutes les demandes d'inscription pour les admins avec informations utilisateur complètes
  const { data: enrollmentRequests = [], isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['admin-enrollment-requests'],
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from('enrollment_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching enrollment requests:', error);
        throw error;
      }

      if (!enrollments) return [];

      // Enrichir chaque demande avec les informations utilisateur et formation
      const enrichedEnrollments = await Promise.all(
        enrollments.map(async (enrollment) => {
          try {
            // Récupérer les informations du profil utilisateur
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email, username, phone, avatar_url')
              .eq('id', enrollment.user_id)
              .single();

            // Récupérer les informations de la formation
            const { data: formationData, error: formationError } = await supabase
              .from('formations')
              .select('title, image_url')
              .eq('id', enrollment.formation_id)
              .single();

            return {
              ...enrollment,
              profiles: profileError ? null : profileData,
              formations: formationError ? null : formationData
            };
          } catch (error) {
            console.error('Error enriching enrollment:', error);
            return enrollment;
          }
        })
      );

      return enrichedEnrollments;
    }
  });

  // Récupérer tous les progrès des utilisateurs pour les admins
  const { data: userProgress = [], isLoading: isLoadingProgress } = useQuery({
    queryKey: ['admin-user-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select(`
          *,
          profiles!user_lesson_progress_user_id_fkey(
            first_name,
            last_name,
            email
          ),
          lessons(
            title,
            levels(
              title,
              formations(
                title
              )
            )
          )
        `)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching user progress:', error);
        throw error;
      }

      return data;
    }
  });

  // Mutation pour approuver/rejeter une inscription et modifier le plan
  const approveEnrollmentMutation = useMutation({
    mutationFn: async ({ 
      enrollmentId, 
      status, 
      rejectedReason,
      planType,
      userId,
      formationId,
      promotionId
    }: {
      enrollmentId: string;
      status: 'approved' | 'rejected';
      rejectedReason?: string;
      planType?: 'free' | 'standard' | 'premium' | 'groupe';
      userId?: string;
      formationId?: string;
      promotionId?: string;
    }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'rejected' && rejectedReason) {
        updateData.rejected_reason = rejectedReason;
      }

      if (planType) {
        updateData.plan_type = planType;
      }

      const { error } = await supabase
        .from('enrollment_requests')
        .update(updateData)
        .eq('id', enrollmentId);

      if (error) throw error;

      // Si le plan est modifié et que l'inscription est approuvée, mettre à jour user_subscriptions
      if (planType && status === 'approved' && userId && formationId) {
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            formation_id: formationId,
            plan_type: planType
          });

        if (subscriptionError) throw subscriptionError;

        // Si c'est un plan groupe et qu'une promotion est sélectionnée, assigner l'étudiant
        if (planType === 'groupe' && promotionId) {
          const { error: promotionError } = await supabase
            .from('student_promotions')
            .upsert({
              student_id: userId,
              promotion_id: promotionId,
              is_active: true
            });

          if (promotionError) {
            console.error('Error assigning student to promotion:', promotionError);
            throw promotionError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-enrollment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Demande d\'inscription mise à jour');
    },
    onError: (error) => {
      console.error('Error updating enrollment:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  });

  // Mutation pour mettre à jour le progrès d'un utilisateur
  const updateUserProgressMutation = useMutation({
    mutationFn: async ({
      progressId,
      status,
      exerciseCompleted
    }: {
      progressId: string;
      status?: 'not_started' | 'in_progress' | 'awaiting_review' | 'completed';
      exerciseCompleted?: boolean;
    }) => {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (exerciseCompleted !== undefined) updateData.exercise_completed = exerciseCompleted;
      if (status === 'completed') updateData.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from('user_lesson_progress')
        .update(updateData)
        .eq('id', progressId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-progress'] });
      toast.success('Progrès utilisateur mis à jour');
    },
    onError: (error) => {
      console.error('Error updating user progress:', error);
      toast.error('Erreur lors de la mise à jour du progrès');
    }
  });

  return {
    enrollmentRequests,
    isLoadingEnrollments,
    userProgress,
    isLoadingProgress,
    approveEnrollment: approveEnrollmentMutation.mutate,
    isApprovingEnrollment: approveEnrollmentMutation.isPending,
    updateUserProgress: updateUserProgressMutation.mutate,
    isUpdatingProgress: updateUserProgressMutation.isPending
  };
};
