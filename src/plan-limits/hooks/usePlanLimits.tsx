import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

/**
 * Hook centralisé pour la gestion robuste des limites de plan
 * Remplace tous les anciens hooks (useChatTimer, useSubscriptionLimits, etc.)
 */

interface PlanLimitsConfig {
  formationId: string;
  context?: 'chat' | 'video' | 'call' | 'general';
  isActive?: boolean;
}

interface UsageLimits {
  // Messages
  message_limit_per_day?: number;
  messages_sent_today: number;

  // Temps (en minutes)
  time_limit_minutes_per_day?: number;
  time_limit_minutes_per_week?: number;
  time_used_today: number;
  time_used_this_week: number;

  // Appels
  allow_calls: boolean;
  call_type: 'none' | 'audio' | 'video' | 'both';
  allowed_call_days: string[];
  calls_made_today: number;

  // Permissions générales
  allow_discussion: boolean;
  allow_exercises: boolean;
}

interface PlanLimitsResult {
  // État des limites
  limits: UsageLimits | null;
  isLoading: boolean;
  
  // Vérifications d'accès
  canSendMessage: () => { allowed: boolean; reason?: string };
  canMakeCall: (type: 'audio' | 'video') => { allowed: boolean; reason?: string };
  canUseTime: () => { allowed: boolean; timeRemaining: number; reason?: string };
  
  // Actions de consommation
  useMessage: () => Promise<void>;
  useTime: (minutes: number) => Promise<void>;
  useCall: () => Promise<void>;
  
  // Timer de session (pour vidéos/chat)
  sessionTime: string;
  isTimerActive: boolean;
  startTimer: () => void;
  stopTimer: () => void;
  
  // Informations utiles
  timeRemainingToday: number | null;
  dailyTimeLimit: number | null;
  isTimeReached: boolean;
  isMessageLimitReached: boolean;
}

export const usePlanLimits = ({ 
  formationId, 
  context = 'general', 
  isActive = true 
}: PlanLimitsConfig): PlanLimitsResult => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole(formationId);
  const queryClient = useQueryClient();
  
  // État du timer de session avec persistance
  const sessionStorageKey = `session-time-${formationId}-${user?.id}`;
  const [sessionSeconds, setSessionSeconds] = useState(() => {
    const saved = sessionStorage.getItem(sessionStorageKey);
    return saved ? parseFloat(saved) : 0;
  });
  const [isTimerActive, setIsTimerActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const lastMinuteSavedRef = useRef<number>(Math.floor(sessionSeconds / 60));

  // Récupération des limites du plan et de l'usage actuel
  const { data: limits, isLoading } = useQuery({
    queryKey: ['plan-limits', user?.id, formationId],
    queryFn: async (): Promise<UsageLimits | null> => {
      if (!user?.id || !formationId) return null;

      // Les professeurs n'ont pas de limites
      if (userRole?.role === 'teacher') {
        return {
          message_limit_per_day: undefined,
          messages_sent_today: 0,
          time_limit_minutes_per_day: undefined,
          time_limit_minutes_per_week: undefined,
          time_used_today: 0,
          time_used_this_week: 0,
          allow_calls: true,
          call_type: 'both',
          allowed_call_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          calls_made_today: 0,
          allow_discussion: true,
          allow_exercises: true,
        };
      }

      // Récupérer les options de plan pour cette formation
      const { data: pricingOptions, error: pricingError } = await supabase
        .from('formation_pricing_options')
        .select('*')
        .eq('formation_id', formationId)
        .eq('is_active', true);

      if (pricingError) {
        console.error('Error fetching pricing options:', pricingError);
        return null;
      }

      // Récupérer l'inscription de l'utilisateur pour connaître son plan
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollment_requests')
        .select('plan_type')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('status', 'approved')
        .single();

      if (enrollmentError) {
        console.error('Error fetching enrollment:', enrollmentError);
        return null;
      }

      // Trouver les options correspondant au plan de l'utilisateur
      const userPlanOptions = pricingOptions?.find(
        option => option.plan_type === enrollment.plan_type
      );

      if (!userPlanOptions) {
        console.error('No pricing options found for user plan:', enrollment.plan_type);
        return null;
      }

      // Récupérer l'usage actuel
      const { data: usage, error: usageError } = await supabase.rpc('get_user_usage', {
        p_user_id: user.id,
        p_formation_id: formationId
      });

      if (usageError) {
        console.error('Error fetching usage:', usageError);
        return null;
      }

      const currentUsage = usage?.[0] || {
        messages_sent_today: 0,
        time_used_today: 0,
        time_used_this_week: 0,
        calls_made_today: 0
      };

      return {
        message_limit_per_day: userPlanOptions.message_limit_per_day,
        messages_sent_today: currentUsage.messages_sent_today,
        time_limit_minutes_per_day: userPlanOptions.time_limit_minutes_per_day,
        time_limit_minutes_per_week: userPlanOptions.time_limit_minutes_per_week,
        time_used_today: currentUsage.time_used_today,
        time_used_this_week: currentUsage.time_used_this_week,
        allow_calls: userPlanOptions.allow_calls || false,
        call_type: (userPlanOptions.call_type as 'none' | 'audio' | 'video' | 'both') || 'none',
        allowed_call_days: userPlanOptions.allowed_call_days || [],
        calls_made_today: currentUsage.calls_made_today,
        allow_discussion: userPlanOptions.allow_discussion || false,
        allow_exercises: userPlanOptions.allow_exercises || false,
      };
    },
    enabled: !!user?.id && !!formationId,
    staleTime: 30000, // Les données restent fraîches 30 secondes
  });

  // Mutations pour consommer les ressources
  const useMessageMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await supabase.rpc('increment_messages_sent', {
        p_user_id: user.id,
        p_formation_id: formationId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-limits', user?.id, formationId] });
    },
  });

  const useTimeMutation = useMutation({
    mutationFn: async (minutes: number) => {
      if (!user?.id || minutes <= 0) return;
      await supabase.rpc('add_time_used', {
        p_user_id: user.id,
        p_formation_id: formationId,
        p_minutes: minutes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-limits', user?.id, formationId] });
    },
  });

  // Gestion du timer de session
  useEffect(() => {
    console.log('Timer effect - isTimerActive:', isTimerActive, 'context:', context);
    
    if (isTimerActive && (context === 'video' || context === 'chat')) {
      console.log('Starting timer interval for', context);
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastUpdateRef.current) / 1000;
        
        setSessionSeconds(prev => {
          const newTotal = prev + elapsed;
          console.log('Timer tick - elapsed:', elapsed, 'newTotal:', newTotal, 'minutes:', Math.floor(newTotal / 60));
          
          // Sauvegarder en temps réel dans sessionStorage
          sessionStorage.setItem(sessionStorageKey, newTotal.toString());
          
          const currentMinutes = Math.floor(newTotal / 60);
          
          // Sauvegarder chaque minute complète
          if (currentMinutes > lastMinuteSavedRef.current && currentMinutes > 0) {
            const minutesToSave = currentMinutes - lastMinuteSavedRef.current;
            console.log('Saving', minutesToSave, 'minutes to database');
            useTimeMutation.mutate(minutesToSave);
            lastMinuteSavedRef.current = currentMinutes;
          }
          
          return newTotal;
        });
        
        lastUpdateRef.current = now;
      }, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else if (intervalRef.current) {
      console.log('Clearing timer interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isTimerActive, context, useTimeMutation, sessionStorageKey]);

  // Fonctions de vérification
  const canSendMessage = useCallback(() => {
    if (userRole?.role === 'teacher') {
      return { allowed: true };
    }

    if (!limits?.allow_discussion) {
      return { 
        allowed: false, 
        reason: 'Les messages ne sont pas autorisés avec votre plan actuel.' 
      };
    }

    if (limits.message_limit_per_day && limits.messages_sent_today >= limits.message_limit_per_day) {
      return { 
        allowed: false, 
        reason: `Vous avez atteint votre limite de ${limits.message_limit_per_day} messages par jour.` 
      };
    }

    return { allowed: true };
  }, [limits, userRole]);

  const canMakeCall = useCallback((type: 'audio' | 'video') => {
    if (userRole?.role === 'teacher') {
      return { allowed: true };
    }

    if (!limits?.allow_calls) {
      return { 
        allowed: false, 
        reason: 'Les appels ne sont pas autorisés avec votre plan actuel.' 
      };
    }

    if (type === 'video' && limits.call_type !== 'video' && limits.call_type !== 'both') {
      return { 
        allowed: false, 
        reason: 'Les appels vidéo ne sont pas autorisés avec votre plan actuel.' 
      };
    }

    // Vérifier les jours autorisés
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (limits.allowed_call_days.length > 0 && !limits.allowed_call_days.includes(today)) {
      return { 
        allowed: false, 
        reason: 'Les appels ne sont pas autorisés aujourd\'hui selon votre plan.' 
      };
    }

    return { allowed: true };
  }, [limits, userRole]);

  const canUseTime = useCallback(() => {
    if (userRole?.role === 'teacher') {
      return { allowed: true, timeRemaining: Infinity };
    }

    if (!limits?.time_limit_minutes_per_day) {
      return { allowed: true, timeRemaining: Infinity };
    }

    const remaining = limits.time_limit_minutes_per_day - limits.time_used_today;
    
    if (remaining <= 0) {
      return { 
        allowed: false, 
        timeRemaining: 0,
        reason: 'Vous avez atteint votre limite de temps quotidienne.' 
      };
    }

    return { allowed: true, timeRemaining: remaining };
  }, [limits, userRole]);

  // Actions
  const useMessage = useCallback(async () => {
    await useMessageMutation.mutateAsync();
  }, [useMessageMutation]);

  const useTime = useCallback(async (minutes: number) => {
    await useTimeMutation.mutateAsync(minutes);
  }, [useTimeMutation]);

  const useCall = useCallback(async () => {
    // Implémenter si nécessaire
  }, []);

  const startTimer = useCallback(() => {
    console.log('🎯 StartTimer called - context:', context, 'isActive:', isActive);
    // Toujours démarrer le timer pour mesurer le temps, même pour les plans gratuits
    // Le canUseTime().allowed sera vérifié dans le composant pour empêcher la lecture
    if (isActive) {
      setIsTimerActive(true);
      lastUpdateRef.current = Date.now();
      console.log('✅ Timer started for context:', context);
    } else {
      console.log('❌ Timer NOT started - isActive:', isActive);
    }
  }, [context, isActive]);

  const stopTimer = useCallback(() => {
    console.log('⏹️ StopTimer called for context:', context);
    setIsTimerActive(false);
  }, [context]);

  // Formatage du temps de session
  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    limits,
    isLoading,
    canSendMessage,
    canMakeCall,
    canUseTime,
    useMessage,
    useTime,
    useCall,
    sessionTime: formatSessionTime(sessionSeconds),
    isTimerActive,
    startTimer,
    stopTimer,
    timeRemainingToday: limits?.time_limit_minutes_per_day 
      ? Math.max(0, limits.time_limit_minutes_per_day - limits.time_used_today)
      : null,
    dailyTimeLimit: limits?.time_limit_minutes_per_day || null,
    isTimeReached: limits?.time_limit_minutes_per_day 
      ? limits.time_used_today >= limits.time_limit_minutes_per_day 
      : false,
    isMessageLimitReached: limits?.message_limit_per_day 
      ? limits.messages_sent_today >= limits.message_limit_per_day 
      : false,
  };
};