/**
 * Hook pour gérer les notifications push (web + Capacitor natif)
 * Utilise NativePushService pour la logique unifiée et sauvegarde le token en DB
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { nativePushService } from '@/services/NativePushService';
import { NotificationService } from '@/services/NotificationService';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreferences {
  daily_reminders: boolean;
  teacher_responses: boolean;
  exercise_validation: boolean;
  new_lessons: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  daily_reminders: true,
  teacher_responses: true,
  exercise_validation: true,
  new_lessons: true,
};

const PREFERENCES_KEY = 'push_notification_preferences';

const getStoredPreferences = (): NotificationPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_PREFERENCES;
};

const storePreferences = (prefs: NotificationPreferences) => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {}
};

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(getStoredPreferences);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  const isSupported = nativePushService.isSupported();
  const isNative = nativePushService.isNativeMobile();

  const [permission, setPermission] = useState<NotificationPermission | null>(
    !isNative && 'Notification' in window ? Notification.permission : null
  );

  const hasPermission = isNative ? currentToken !== null : permission === 'granted';

  // Écouter les tokens natifs (arrivent parfois après un délai)
  useEffect(() => {
    if (!isNative) return;
    const unsub = nativePushService.onToken(async (token) => {
      console.log('🔑 [usePushNotifications] Token natif reçu:', token.substring(0, 20) + '...');
      setCurrentToken(token);
      // Sauvegarder automatiquement si on a un user
      if (user?.id) {
        try {
          await NotificationService.saveToken(user.id, token);
          // Sauvegarder aussi les préférences en DB
          const prefs = getStoredPreferences();
          await supabase
            .from('push_tokens')
            .update({ notification_preferences: JSON.parse(JSON.stringify(prefs)) })
            .eq('user_id', user.id);
          console.log('✅ [usePushNotifications] Token + préférences sauvegardés en DB');
        } catch (err) {
          console.error('❌ [usePushNotifications] Erreur sauvegarde token:', err);
        }
      }
    });
    return unsub;
  }, [isNative, user?.id]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('🔔 [usePushNotifications] Demande de permission...');
      const result = await nativePushService.initialize();
      console.log('📋 [usePushNotifications] Résultat initialize:', result);

      if (result.success) {
        if (result.token) {
          setCurrentToken(result.token);
          // Sauvegarder le token en DB
          if (user?.id) {
            try {
              await NotificationService.saveToken(user.id, result.token);
              const prefs = getStoredPreferences();
              await supabase
                .from('push_tokens')
                .update({ notification_preferences: JSON.parse(JSON.stringify(prefs)) })
                .eq('user_id', user.id);
              console.log('✅ [usePushNotifications] Token sauvegardé après permission');
            } catch (err) {
              console.error('❌ [usePushNotifications] Erreur sauvegarde:', err);
            }
          }
        }

        if (!isNative) {
          setPermission('granted');
        }
        toast.success('Notifications activées !');
        return true;
      }

      if (result.error) {
        console.error('❌ [usePushNotifications] Erreur:', result.error);
        toast.error(result.error);
      }
      return false;
    } catch (err) {
      console.error('❌ [usePushNotifications] Exception:', err);
      toast.error('Erreur lors de l\'activation des notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isNative, user?.id]);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      storePreferences(next);
      // Mettre à jour en DB aussi
      if (user?.id) {
        supabase
          .from('push_tokens')
          .update({ notification_preferences: JSON.parse(JSON.stringify(next)) })
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.error('Erreur update préférences DB:', error);
          });
      }
      return next;
    });
  }, [user?.id]);

  const disableNotifications = useCallback(async () => {
    toast.info('Notifications désactivées');
    if (user?.id) {
      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);
    }
  }, [user?.id]);

  const sendTestNotification = useCallback(async () => {
    try {
      if (user?.id && currentToken) {
        await NotificationService.sendTestNotification(user.id, currentToken);
        toast.success('🔔 Notification de test envoyée !');
        return;
      }
      if (!isNative && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Test EducTok', {
          body: 'Les notifications fonctionnent correctement ! 🎉',
          icon: '/favicon.ico',
        });
      } else {
        toast.info('Veuillez d\'abord activer les notifications');
      }
    } catch (err) {
      console.error('Test notification error:', err);
      toast.error('Erreur lors du test');
    }
  }, [isNative, user?.id, currentToken]);

  return {
    isSupported,
    permission,
    hasPermission,
    preferences,
    isLoading,
    requestPermission,
    updatePreferences,
    disableNotifications,
    sendTestNotification,
  };
};
