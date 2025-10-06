import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer les membres ayant accès à un niveau spécifique
 * Utilisé côté professeur pour voir les élèves d'un niveau donné
 */
export const useLevelMembers = (formationId: string, levelId: string) => {
  return useQuery({
    queryKey: ['level-members', formationId, levelId],
    queryFn: async () => {
      if (!formationId || !levelId) return [];

      console.log('Fetching level members:', { formationId, levelId });

      // Récupérer tous les étudiants qui ont une progression dans ce niveau
      const { data: progressData, error: progressError } = await supabase
        .from('user_lesson_progress')
        .select('user_id')
        .eq('level_id', levelId);

      if (progressError) {
        console.error('Error fetching level progress:', progressError);
        return [];
      }

      if (!progressData || progressData.length === 0) {
        console.log('No students found for this level');
        return [];
      }

      // Extraire les IDs uniques des étudiants
      const uniqueUserIds = [...new Set(progressData.map(p => p.user_id))];

      // Récupérer les profils de ces étudiants avec leur niveau actuel
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', uniqueUserIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      // Pour chaque élève, récupérer son niveau actuel
      const membersWithLevel = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Récupérer la dernière progression de l'élève
          const { data: lastProgress } = await supabase
            .from('user_lesson_progress')
            .select(`
              level_id,
              levels:level_id (
                title,
                order_index
              )
            `)
            .eq('user_id', profile.id)
            .order('create_at', { ascending: false })
            .limit(1)
            .single();

          return {
            student_id: profile.id,
            profiles: profile,
            joined_at: null,
            current_level: lastProgress?.levels as any
          };
        })
      );

      console.log('Level members found:', membersWithLevel.length);
      return membersWithLevel;
    },
    enabled: !!formationId && !!levelId,
  });
};
