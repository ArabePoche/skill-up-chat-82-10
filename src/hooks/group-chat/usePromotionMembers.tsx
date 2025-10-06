import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer les membres d'une promotion filtrés par niveau
 * Un élève voit uniquement les membres des niveaux >= à son niveau actuel
 */
export const usePromotionMembers = (
  formationId: string, 
  promotionId: string | null, 
  currentLevelId?: string
) => {
  return useQuery({
    queryKey: ['promotion-members', formationId, promotionId, currentLevelId],
    queryFn: async () => {
      if (!promotionId) return [];

      console.log('Fetching promotion members:', { formationId, promotionId, currentLevelId });

      // Récupérer l'order_index du niveau actuel de l'élève
      let currentLevelOrderIndex: number | null = null;
      
      if (currentLevelId) {
        const { data: currentLevel } = await supabase
          .from('levels')
          .select('order_index')
          .eq('id', currentLevelId)
          .single();
        
        currentLevelOrderIndex = currentLevel?.order_index ?? null;
        console.log('Current level order_index:', currentLevelOrderIndex);
      }

      // Récupérer les étudiants de cette promotion avec leur progression
      const { data: members, error } = await supabase
        .from('student_promotions')
        .select(`
          student_id,
          joined_at,
          profiles:student_id (
            id,
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq('promotion_id', promotionId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching promotion members:', error);
        return [];
      }

      // Si pas de niveau actuel défini, retourner tous les membres
      if (currentLevelOrderIndex === null) {
        console.log('No current level, showing all members:', members?.length || 0);
        return members || [];
      }

      // Filtrer les membres pour ne garder que ceux des niveaux >= au niveau actuel
      const filteredMembers = await Promise.all(
        (members || []).map(async (member) => {
          // Récupérer le niveau actuel du membre
          const { data: memberProgress } = await supabase
            .from('user_lesson_progress')
            .select(`
              level_id,
              levels:level_id (
                title,
                order_index
              )
            `)
            .eq('user_id', member.student_id)
            .order('create_at', { ascending: false })
            .limit(1)
            .single();

          const memberLevelOrderIndex = (memberProgress?.levels as any)?.order_index;
          
          // Inclure le membre si son niveau >= niveau actuel de l'élève connecté
          const shouldInclude = memberLevelOrderIndex >= currentLevelOrderIndex;
          
          console.log('Member level check:', {
            memberId: member.student_id,
            memberLevel: memberLevelOrderIndex,
            currentLevel: currentLevelOrderIndex,
            shouldInclude
          });

          return shouldInclude ? {
            ...member,
            current_level: memberProgress?.levels
          } : null;
        })
      );

      const result = filteredMembers.filter(m => m !== null);
      console.log('Filtered promotion members:', result.length);
      return result;
    },
    enabled: !!promotionId && !!formationId,
  });
};
