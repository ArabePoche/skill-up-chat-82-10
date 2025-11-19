import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Hook pour récupérer les demandes d'adhésion et messages de l'école
 */
export const useSchoolMessages = (schoolId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer toutes les demandes d'adhésion pour cette école
  const { data: joinRequests = [], isLoading } = useQuery({
    queryKey: ['school-join-requests', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_join_requests')
        .select(`
          *,
          user:profiles!school_join_requests_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !!user,
  });

  // Approuver une demande
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, userId, schoolId, role }: {
      requestId: string;
      userId: string;
      schoolId: string;
      role: string;
    }) => {
      // Récupérer les données de la demande
      const { data: request, error: requestError } = await supabase
        .from('school_join_requests')
        .select(`
          *,
          user:profiles!school_join_requests_user_id_fkey(
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Mettre à jour le statut de la demande
      const { error: updateError } = await supabase
        .from('school_join_requests')
        .update({ 
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Si c'est un professeur, l'ajouter à school_teachers
      if (role === 'teacher' && request.user) {
        const formData = (request.form_data || {}) as {
          teacherType?: 'specialist' | 'generalist';
          specialty?: string;
          preferredGrade?: string;
          message?: string;
        };
        const teacherType = formData.teacherType || 'generalist';
        const specialties = formData.specialty ? [formData.specialty] : [];

        // Créer ou mettre à jour l'entrée dans school_teachers (upsert)
        const { data: teacherData, error: teacherError } = await supabase
          .from('school_teachers')
          .upsert({
            school_id: schoolId,
            user_id: userId,
            first_name: request.user.first_name || '',
            last_name: request.user.last_name || '',
            email: request.user.email || '',
            phone: request.user.phone || '',
            teacher_type: teacherType,
            specialties: specialties.length > 0 ? specialties : null,
            employment_status: 'active',
            application_status: 'approved',
            hire_date: new Date().toISOString().split('T')[0],
          }, {
            onConflict: 'school_id,user_id'
          })
          .select()
          .single();

        if (teacherError) throw teacherError;

        // Si une classe préférée est spécifiée pour un généraliste
        if (teacherType === 'generalist' && formData.preferredGrade && teacherData) {
          // Trouver la classe par son nom
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id')
            .eq('school_id', schoolId)
            .eq('name', formData.preferredGrade)
            .single();

          if (classError) {
            console.error('Erreur lors de la recherche de la classe:', classError);
          } else if (classData) {
            // Créer l'entrée dans school_teacher_classes
            const { error: classAssignError } = await supabase
              .from('school_teacher_classes')
              .insert({
                teacher_id: teacherData.id,
                class_id: classData.id,
                subject: 'Généraliste',
              });

            if (classAssignError) {
              console.error('Erreur lors de l\'assignation à la classe:', classAssignError);
            }
          }
        }
      }
      
      toast.success('Demande approuvée');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-join-requests'] });
    },
    onError: (error) => {
      console.error('Error approving request:', error);
      toast.error('Erreur lors de l\'approbation');
    },
  });

  // Refuser une demande
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: {
      requestId: string;
      reason?: string;
    }) => {
      // Mettre à jour le statut de la demande
      const { error } = await supabase
        .from('school_join_requests')
        .update({ 
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;
      
      toast.success('Demande refusée');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-join-requests'] });
    },
    onError: (error) => {
      console.error('Error rejecting request:', error);
      toast.error('Erreur lors du refus');
    },
  });

  return {
    joinRequests,
    isLoading,
    approveRequest: approveMutation.mutate,
    rejectRequest: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
};
