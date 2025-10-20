import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook pour récupérer les membres d'une promotion filtrés par niveau
 * Logique hiérarchique :
 * - Si mon niveau > niveau consulté : je vois TOUS les membres (consultation d'un niveau inférieur)
 * - Si mon niveau <= niveau consulté : je vois seulement ceux >= niveau consulté
 */
export const usePromotionMembers = (
  formationId: string, 
  promotionId: string | null, 
  viewedLevelId?: string
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['promotion-members', formationId, promotionId, viewedLevelId, user?.id],
    queryFn: async () => {
      if (!promotionId || !user?.id) return [];

      console.log('Fetching promotion members:', { formationId, promotionId, viewedLevelId, userId: user.id });

      // Récupérer l'order_index du niveau consulté (niveau du groupe)
      let viewedLevelOrderIndex: number | null = null;
      
      if (viewedLevelId) {
        const { data: viewedLevel } = await supabase
          .from('levels')
          .select('order_index')
          .eq('id', viewedLevelId)
          .single();
        
        viewedLevelOrderIndex = viewedLevel?.order_index ?? null;
        console.log('Viewed level order_index:', viewedLevelOrderIndex);
      }

      // Récupérer le niveau de progression actuel de l'utilisateur connecté
      let userCurrentLevelOrderIndex: number | null = null;
      
      const { data: userProgress } = await supabase
        .from('user_lesson_progress')
        .select(`
          level_id,
          levels:level_id (
            order_index
          )
        `)
        .eq('user_id', user.id)
        .order('create_at', { ascending: false })
        .limit(1)
        .single();
      
      userCurrentLevelOrderIndex = (userProgress?.levels as any)?.order_index ?? 0;
      console.log('User current level order_index:', userCurrentLevelOrderIndex);

      // Récupérer tous les étudiants de cette promotion
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

      // Si pas de niveau consulté défini, retourner tous les membres
      if (viewedLevelOrderIndex === null) {
        console.log('No viewed level, showing all members:', members?.length || 0);
        return members || [];
      }

      // Logique de filtrage selon la hiérarchie
      // Si mon niveau > niveau consulté : je vois TOUS les membres (consultation d'un niveau inférieur)
      if (userCurrentLevelOrderIndex > viewedLevelOrderIndex) {
        console.log('User level > viewed level (consulting lower level), showing ALL members');
        
        // Enrichir avec les niveaux actuels des membres
        const enrichedMembers = await Promise.all(
          (members || []).map(async (member) => {
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

            return {
              ...member,
              current_level: memberProgress?.levels
            };
          })
        );
        
        return enrichedMembers;
      }

      // Si mon niveau <= niveau consulté : je vois seulement ceux >= niveau consulté
      console.log('User level <= viewed level, filtering members to show only those at this level or higher');
      
      const filteredMembers = await Promise.all(
        (members || []).map(async (member) => {
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

          const memberLevelOrderIndex = (memberProgress?.levels as any)?.order_index ?? 0;
          
          // Inclure seulement si le membre est >= niveau consulté
          const shouldInclude = memberLevelOrderIndex >= viewedLevelOrderIndex;
          
          console.log('Member level check:', {
            memberId: member.student_id,
            memberLevel: memberLevelOrderIndex,
            viewedLevel: viewedLevelOrderIndex,
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
    enabled: !!promotionId && !!formationId && !!user?.id,
  });
};
