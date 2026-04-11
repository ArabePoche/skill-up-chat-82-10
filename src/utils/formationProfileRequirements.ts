import { supabase } from '@/integrations/supabase/client';

export interface FormationRequiredProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  gender?: string | null;
}

export const getFormationRequiredProfile = async (userId: string): Promise<FormationRequiredProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, username, email, phone, country, gender')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking formation profile requirements:', error);
    throw new Error('Erreur lors de la vérification du profil');
  }

  return data;
};

export const isFormationProfileComplete = (profile: Pick<FormationRequiredProfile, 'phone' | 'country' | 'gender'> | null | undefined) =>
  Boolean(profile?.phone && profile?.country && profile?.gender);
