
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStudentsByFormation = (formationId: string) => {
  return useQuery({
    queryKey: ['students-by-formation', formationId],
    queryFn: async () => {
      if (!formationId) return [];

      console.log('Fetching students for formation:', formationId);

      // Première étape : vérifier les demandes d'inscription approuvées
      const { data: enrollments, error } = await supabase
        .from('enrollment_requests')
        .select(`
          id,
          user_id,
          formation_id,
          status,
          created_at
        `)
        .eq('formation_id', formationId)
        .eq('status', 'approved');

      console.log('Raw enrollment requests query result:', { enrollments, error });

      if (error) {
        console.error('Error fetching enrollment requests:', error);
        throw error;
      }

      if (!enrollments || enrollments.length === 0) {
        console.log('No approved enrollment requests found for formation:', formationId);
        return [];
      }

      console.log('Found approved enrollments:', enrollments);

      // Deuxième étape : récupérer les profils des utilisateurs inscrits
      const userIds = enrollments.map(enrollment => enrollment.user_id);
      console.log('Fetching profiles for user IDs:', userIds);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', userIds);

      console.log('Profiles query result:', { profiles, profilesError });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Troisième étape : combiner les données d'inscription avec les profils
      const studentsWithProfiles = enrollments.map(enrollment => ({
        ...enrollment,
        profiles: profiles?.find(profile => profile.id === enrollment.user_id) || null
      }));

      console.log('Final students with profiles:', studentsWithProfiles);
      return studentsWithProfiles || [];
    },
    enabled: !!formationId,
  });
};
