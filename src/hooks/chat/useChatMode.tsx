
/**
 * Hook pour détecter automatiquement le mode de chat (privé ou groupe)
 * et appliquer la logique de récupération des messages appropriée
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudentPromotion } from '@/hooks/usePromotion';

export type ChatMode = 'private' | 'group';

export interface ChatModeData {
  mode: ChatMode;
  isLoading: boolean;
  promotionId?: string;
  planType?: string;
}

export const useChatMode = (formationId: string): ChatModeData => {
  const { user } = useAuth();
  const { data: studentPromotion, isLoading: promotionLoading } = useStudentPromotion(formationId);

  const { data: enrollmentData, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['user-enrollment-plan', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return null;

      console.log('🔍 Fetching enrollment data for chat mode detection:', { userId: user.id, formationId });

      // Récupérer les informations d'inscription pour déterminer le plan
      const { data: enrollment, error } = await supabase
        .from('enrollment_requests')
        .select('plan_type')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('status', 'approved')
        .single();

      if (error) {
        console.error('Error fetching enrollment data:', error);
        return null;
      }

      console.log('📋 Enrollment data found:', enrollment);
      return enrollment;
    },
    enabled: !!user?.id && !!formationId,
  });

  // Déterminer le mode de chat
  const isLoading = promotionLoading || enrollmentLoading;
  
  // Si l'élève a une promotion et un plan_type "groupe", c'est un chat de groupe
  const isGroupMode = studentPromotion && (enrollmentData?.plan_type === 'groupe' || enrollmentData?.plan_type === 'premium');
  
  const mode: ChatMode = isGroupMode ? 'group' : 'private';

  console.log('🎯 Chat mode detected:', {
    mode,
    hasPromotion: !!studentPromotion,
    planType: enrollmentData?.plan_type,
    promotionId: studentPromotion?.promotion_id
  });

  return {
    mode,
    isLoading,
    promotionId: studentPromotion?.promotion_id,
    planType: enrollmentData?.plan_type
  };
};
