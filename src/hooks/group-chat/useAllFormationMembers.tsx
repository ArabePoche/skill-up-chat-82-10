import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer TOUS les membres d'une formation (pour les professeurs)
 * Retourne tous les étudiants inscrits, peu importe leur promotion ou niveau
 */
export const useAllFormationMembers = (formationId: string) => {
  return useQuery({
    queryKey: ['all-formation-members', formationId],
    queryFn: async () => {
      if (!formationId) return [];

      console.log('Fetching all formation members:', formationId);

      // Récupérer tous les étudiants inscrits à cette formation
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollment_requests')
        .select('user_id')
        .eq('formation_id', formationId)
        .eq('status', 'approved');

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
        return [];
      }

      if (!enrollments || enrollments.length === 0) {
        console.log('No enrolled students found');
        return [];
      }

      const userIds = enrollments.map(e => e.user_id);

      // Récupérer les profils de tous ces étudiants
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      console.log('All formation members found:', profiles?.length || 0);
      
      // Formatter pour correspondre à la structure attendue
      return profiles?.map(profile => ({
        student_id: profile.id,
        profiles: profile,
        joined_at: null
      })) || [];
    },
    enabled: !!formationId,
  });
};
