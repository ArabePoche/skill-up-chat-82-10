import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer les membres d'une promotion
 */
export const usePromotionMembers = (formationId: string, promotionId: string | null) => {
  return useQuery({
    queryKey: ['promotion-members', formationId, promotionId],
    queryFn: async () => {
      if (!promotionId) return [];

      console.log('Fetching promotion members:', { formationId, promotionId });

      // Récupérer les étudiants de cette promotion
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

      console.log('Promotion members found:', members?.length || 0);
      return members || [];
    },
    enabled: !!promotionId && !!formationId,
  });
};
