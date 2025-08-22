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
      planType?: 'free' | 'standard' | 'premium' | 'groupe';
    }) => {
      console.log('Creating enrollment request for:', { formationId, userId, planType });

      // Vérifier d'abord si le profil est complet
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone, country, gender')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error checking profile:', profileError);
        throw new Error('Erreur lors de la vérification du profil');
      }

      // Vérifier si les champs obligatoires sont remplis
      if (!profile.phone || !profile.country || !profile.gender) {
        throw new Error('PROFILE_INCOMPLETE');
      }

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
        // S'assurer que le plan_type est valide pour la base de données
        const validPlanType = ['free', 'standard', 'premium', 'groupe'].includes(planType) ? planType : 'free';
        
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            formation_id: formationId,
            plan_type: validPlanType
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
      if (error.message === 'PROFILE_INCOMPLETE') {
        toast.error('Veuillez compléter votre profil avant de vous inscrire à une formation, le pays, genre et numéro de téléphone sont obligatoire pour s/inscrire');
        // Rediriger vers la page de profil
        window.location.href = '/complete-profile';
        return;
      }
      toast.error(error.message || 'Erreur lors de l\'inscription. Veuillez réessayer.');
    },
  });
};

// Hook pour les changements de plan avec notifications
export const useCreatePlanChangeRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      formationId, 
      planType, 
      justification 
    }: { 
      formationId: string; 
      planType: string; 
      justification?: string; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Récupérer les informations utilisateur et formation
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', user.id)
        .single();

      const { data: formation } = await supabase
        .from('formations')
        .select('title')
        .eq('id', formationId)
        .single();

      const userName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Un élève';
      const formationTitle = formation?.title || 'une formation';
      const userPhone = userProfile?.phone || 'Non renseigné';

      // Vérifier s'il existe déjà une demande en attente pour ce changement
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('type', 'plan_change_request')
        .eq('is_read', false)
        .maybeSingle();

      if (existingNotification) {
        // Mettre à jour la notification existante
        const { error } = await supabase
          .from('notifications')
          .update({
            requested_plan_type: planType,
            message: `${userName} a demandé à passer au plan "${planType}" pour la formation "${formationTitle}".${justification ? `\n\nJustification : ${justification}` : ''}\n\nTéléphone : ${userPhone}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingNotification.id);

        if (error) throw error;
        return { updated: true };
      } else {
        // Créer une nouvelle notification pour les admins
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            formation_id: formationId,
            type: 'plan_change_request',
            title: 'Demande de changement de plan',
            message: `${userName} a demandé à passer au plan "${planType}" pour la formation "${formationTitle}".${justification ? `\n\nJustification : ${justification}` : ''}\n\nTéléphone : ${userPhone}`,
            requested_plan_type: planType,
            is_for_all_admins: true,
            is_read: false
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Demande de changement de plan envoyée avec succès !');
    },
    onError: (error: any) => {
      console.error('Erreur lors de la demande de changement:', error);
      toast.error('Erreur lors de l\'envoi de la demande. Veuillez réessayer.');
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
    planType: 'free' | 'standard' | 'premium' | 'groupe' = 'free'
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