import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCallback, useState } from 'react';

export const useCreateEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      formationId, 
      userId, 
      planType = 'free' 
    }: { 
      formationId: string; 
      userId: string; 
      planType?: 'free' | 'standard' | 'premium';
    }) => {
      console.log('Creating enrollment request for:', { formationId, userId, planType });

      // Vérifier si l'utilisateur n'a pas déjà une demande en cours ou approuvée
      const { data: existingRequest, error: checkError } = await supabase
        .from('enrollment_requests')
        .select('id, status')
        .eq('user_id', userId)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing enrollment:', checkError);
        throw checkError;
      }

      if (existingRequest) {
        if (existingRequest.status === 'approved') {
          throw new Error('Vous êtes déjà inscrit à cette formation');
        } else if (existingRequest.status === 'pending') {
          throw new Error('Votre demande d\'inscription est en cours de traitement');
        }
      }

      // Vérifier si l'abonnement existe déjà, sinon le créer
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('id, plan_type')
        .eq('user_id', userId)
        .eq('formation_id', formationId)
        .maybeSingle();

      if (!existingSubscription) {
        // Créer l'abonnement si il n'existe pas
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            formation_id: formationId,
            plan_type: planType
          });

        if (subscriptionError) {
          console.error('Subscription creation error:', subscriptionError);
          throw new Error('Erreur lors de la création de l\'abonnement');
        }
      }

      // Créer la demande d'inscription avec le plan choisi
      const { data: enrollmentRequest, error: requestError } = await supabase
        .from('enrollment_requests')
        .insert({
          user_id: userId,
          formation_id: formationId,
          status: 'pending',
          plan_type: planType
        })
        .select()
        .single();

      if (requestError) {
        console.error('Enrollment request error:', requestError);
        throw requestError;
      }

      console.log('Enrollment request created:', enrollmentRequest);

      return enrollmentRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['students-by-formation'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Demande d\'inscription envoyée avec succès !');
    },
    onError: (error: any) => {
      console.error('Erreur lors de l\'inscription:', error);
      toast.error(error.message || 'Erreur lors de l\'inscription. Veuillez réessayer.');
    },
  });
};

// Hook personnalisé avec protection contre les clics multiples
export const useEnrollmentWithProtection = () => {
  const createEnrollment = useCreateEnrollment();
  const [pendingFormations, setPendingFormations] = useState<Set<string>>(new Set());

  const enroll = useCallback(async (
    formationId: string, 
    userId: string, 
    planType: 'free' | 'standard' | 'premium' = 'free'
  ) => {
    if (pendingFormations.has(formationId)) {
      console.log('Inscription déjà en cours pour la formation:', formationId);
      return;
    }

    console.log('Starting enrollment process for:', { formationId, userId, planType });

    setPendingFormations(prev => new Set(prev).add(formationId));

    try {
      const result = await createEnrollment.mutateAsync({ formationId, userId, planType });
      return result;
    } finally {
      setPendingFormations(prev => {
        const newSet = new Set(prev);
        newSet.delete(formationId);
        return newSet;
      });
    }
  }, [createEnrollment, pendingFormations]);

  const isFormationPending = useCallback((formationId: string) => {
    return pendingFormations.has(formationId);
  }, [pendingFormations]);

  return {
    enroll,
    isFormationPending,
    isPending: createEnrollment.isPending,
    isSuccess: createEnrollment.isSuccess,
    error: createEnrollment.error
  };
};

export const useStudentsByFormation = (formationId: string) => {
  return useQuery({
    queryKey: ['formation-students', formationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select(`
          *,
          profiles!enrollment_requests_user_id_fkey (
            id,
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq('formation_id', formationId)
        .eq('status', 'approved');

      if (error) throw error;
      return data || [];
    },
    enabled: !!formationId,
  });
};
