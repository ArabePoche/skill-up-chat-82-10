import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getFormationRequiredProfile, isFormationProfileComplete } from '@/utils/formationProfileRequirements';

export interface FormationPreRegistrationRecord {
  id: string;
  user_id: string;
  motivation?: string | null;
  created_at: string;
  notified_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  avatar_url?: string | null;
}

export const useCreateFormationPreRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formationId,
      userId,
      motivation,
    }: {
      formationId: string;
      userId: string;
      motivation?: string;
    }) => {
      const profile = await getFormationRequiredProfile(userId);

      if (!isFormationProfileComplete(profile)) {
        throw new Error('PROFILE_INCOMPLETE');
      }

      const { data: formation, error: formationError } = await supabase
        .from('formations')
        .select('is_active')
        .eq('id', formationId)
        .single();

      if (formationError) {
        throw formationError;
      }

      if (formation?.is_active) {
        throw new Error('Cette formation est déjà active. Utilisez l’inscription classique.');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      const { data: existingRegistration, error: existingRegistrationError } = await db
        .from('formation_pre_registrations')
        .select('id')
        .eq('formation_id', formationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRegistrationError) {
        throw existingRegistrationError;
      }

      if (existingRegistration) {
        throw new Error('Vous êtes déjà pré-inscrit à cette formation');
      }

      const { data, error } = await db
        .from('formation_pre_registrations')
        .insert({
          formation_id: formationId,
          user_id: userId,
          motivation: motivation?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['formation-pre-registrations', variables.formationId] });
      toast.success('Pré-inscription enregistrée avec succès !');
    },
    onError: (error: Error) => {
      if (error.message === 'PROFILE_INCOMPLETE') {
        toast.error('Veuillez compléter votre profil avant de vous pré-inscrire. Le pays, le genre et le numéro de téléphone sont obligatoires.');
        window.location.href = '/complete-profile';
        return;
      }

      toast.error(error.message || 'Erreur lors de la pré-inscription.');
    },
  });
};

export const useFormationPreRegistrations = (formationId: string, enabled = true) =>
  useQuery({
    queryKey: ['formation-pre-registrations', formationId],
    queryFn: async () => {
      if (!formationId) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      const { data, error } = await db.rpc('get_formation_pre_registrations', {
        p_formation_id: formationId,
      });

      if (error) {
        throw error;
      }

      return (data || []) as FormationPreRegistrationRecord[];
    },
    enabled: enabled && !!formationId,
  });
