/**
 * Hook pour gérer les invitations de CV par les propriétaires de boutique
 * Permet d'inviter un candidat et de vérifier les invitations existantes
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSendCvInvitation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cvId,
      cvOwnerId,
      inviterId,
      shopId,
      jobListingId,
      message,
    }: {
      cvId: string;
      cvOwnerId: string;
      inviterId: string;
      shopId?: string;
      jobListingId?: string;
      message: string;
    }) => {
      const { data, error } = await supabase
        .from('cv_invitations')
        .insert({
          cv_id: cvId,
          cv_owner_id: cvOwnerId,
          inviter_id: inviterId,
          shop_id: shopId || null,
          job_listing_id: jobListingId || null,
          message: message.trim(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Notifier le propriétaire du CV
      await supabase.from('notifications').insert({
        user_id: cvOwnerId,
        type: 'cv_invitation',
        title: 'Invitation reçue',
        message: 'Un recruteur souhaite vous contacter suite à votre CV',
        is_read: false,
      });

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Invitation envoyée !',
        description: 'Le candidat sera notifié de votre intérêt.',
      });
      queryClient.invalidateQueries({ queryKey: ['cv-invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'envoyer l'invitation",
        variant: 'destructive',
      });
    },
  });
};

export const useMyInvitations = (userId?: string) => {
  return useQuery({
    queryKey: ['cv-invitations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cv_invitations')
        .select('*')
        .eq('cv_owner_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useCheckExistingInvitation = (inviterId: string, cvId: string) => {
  return useQuery({
    queryKey: ['cv-invitation-check', inviterId, cvId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cv_invitations')
        .select('id, status')
        .eq('inviter_id', inviterId)
        .eq('cv_id', cvId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!inviterId && !!cvId,
  });
};
