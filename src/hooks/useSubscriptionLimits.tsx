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
  const [planConfig, setPlanConfig] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Récupérer le plan de l'utilisateur pour cette formation
        const { data: enrollments } = await (supabase as any)
          .from('enrollment_requests')
          .select('plan_type')
          .eq('user_id', user.id)
          .eq('formation_id', formationId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);

        const planType = enrollments?.[0]?.plan_type || 'free';

        // 2. Récupérer les configurations du plan depuis formation_pricing_options
        const { data: pricingOptions } = await supabase
          .from('formation_pricing_options')
          .select('*')
          .eq('formation_id', formationId)
          .eq('plan_type', planType)
          .maybeSingle();

        if (pricingOptions) {
          setPlanConfig(pricingOptions);
        }

        // 3. Récupérer l'utilisation quotidienne
        const { data: usage } = await supabase
          .rpc('get_user_usage', {
            p_user_id: user.id,
            p_formation_id: formationId
          });

        if (usage && usage.length > 0) {
          const userUsage = usage[0];
          // Utiliser la limite de temps de la configuration
          const dailyLimit = pricingOptions?.time_limit_minutes_per_day || 1440; // Par défaut illimité ou 24h
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
    // Vérifier la limite de temps quotidienne
    const isLimitReached = timeRemainingToday !== null && timeRemainingToday <= 0;

    if (isLimitReached) {
      return {
        allowed: false,
        message: "Vous avez atteint la limite de temps quotidienne de votre abonnement. Passez à un plan supérieur pour continuer."
      };
    }

    if (planConfig) {
      if (action === 'call') {
        if (!planConfig.allow_calls || planConfig.call_type === 'none') {
          return {
            allowed: false,
            message: "Votre abonnement actuel ne vous autorise pas à passer des appels."
          };
        }
      }

      if (action === 'video_call') {
        if (!planConfig.allow_calls || (planConfig.call_type !== 'video' && planConfig.call_type !== 'both')) {
          return {
            allowed: false,
            message: "Les appels vidéo nécessitent un abonnement supérieur selon la configuration de ce cours."
          };
        }
      }

      if (action === 'message') {
        if (planConfig.allow_discussion === false) {
           return {
             allowed: false,
             message: "Les discussions ne sont pas incluses dans votre formule d'abonnement."
           };
        }
      }
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