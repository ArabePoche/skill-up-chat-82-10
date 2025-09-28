import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionLimits {
  timeRemainingToday: number | null;
  dailyTimeLimit: number | null;
  isLimitReached: boolean;
  checkPermission: (action: 'message' | 'call' | 'video_call') => {
    allowed: boolean;
    message?: string;
  };
}

export const useSubscriptionLimits = (formationId: string): SubscriptionLimits => {
  const [timeRemainingToday, setTimeRemainingToday] = useState<number | null>(null);
  const [dailyTimeLimit, setDailyTimeLimit] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Récupérer l'utilisation quotidienne
        const { data: usage } = await supabase
          .rpc('get_user_usage', {
            p_user_id: user.id,
            p_formation_id: formationId
          });

        if (usage && usage.length > 0) {
          const userUsage = usage[0];
          // Simuler une limite quotidienne de 60 minutes pour les utilisateurs gratuits
          const dailyLimit = 60; // minutes
          const remainingTime = Math.max(0, dailyLimit - userUsage.time_used_today);
          
          setDailyTimeLimit(dailyLimit);
          setTimeRemainingToday(remainingTime);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des limites:', error);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les limites d'abonnement",
          variant: "destructive"
        });
      }
    };

    if (formationId) {
      fetchLimits();
    }
  }, [formationId, toast]);

  const checkPermission = (action: 'message' | 'call' | 'video_call') => {
    // Simuler des limites pour les utilisateurs gratuits
    const isLimitReached = timeRemainingToday !== null && timeRemainingToday <= 0;

    if (isLimitReached) {
      return {
        allowed: false,
        message: "Vous avez atteint votre limite quotidienne. Passez à un plan premium pour continuer."
      };
    }

    if (action === 'call' || action === 'video_call') {
      // Simuler une restriction d'appels pour les utilisateurs gratuits
      return {
        allowed: false,
        message: "Les appels nécessitent un abonnement premium. Passez à un plan supérieur pour débloquer cette fonctionnalité."
      };
    }

    return { allowed: true };
  };

  return {
    timeRemainingToday,
    dailyTimeLimit,
    isLimitReached: timeRemainingToday !== null && timeRemainingToday <= 0,
    checkPermission
  };
};