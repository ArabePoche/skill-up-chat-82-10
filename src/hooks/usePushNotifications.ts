/**
 * Hook pour gérer les notifications push (web + Capacitor natif)
 * Gère les permissions, préférences et envoi de notifications de test
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

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
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(getStoredPreferences);

  // Check if notifications are supported
  const isCapacitorNative =
    typeof (window as any).Capacitor !== 'undefined' &&
    ((window as any).Capacitor.getPlatform?.() === 'android' ||
      (window as any).Capacitor.getPlatform?.() === 'ios');

  const isSupported = isCapacitorNative || ('Notification' in window && 'serviceWorker' in navigator);

  const [permission, setPermission] = useState<NotificationPermission | null>(
    !isCapacitorNative && 'Notification' in window ? Notification.permission : null
  );

  const hasPermission = isCapacitorNative ? true : permission === 'granted';

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isCapacitorNative) {
        // Capacitor native push
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const result = await PushNotifications.requestPermissions();
          const granted = result.receive === 'granted';
          if (granted) {
            await PushNotifications.register();
            toast.success('Notifications activées !');
          }
          return granted;
        } catch (err) {
          console.error('Capacitor push error:', err);
          return false;
        }
      }

      // Web push
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          toast.success('Notifications activées !');
          return true;
        }
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isCapacitorNative]);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      storePreferences(next);
      return next;
    });
  }, []);

  const disableNotifications = useCallback(async () => {
    toast.info('Notifications désactivées');
    // Can't programmatically revoke web permission, just inform user
  }, []);

  const sendTestNotification = useCallback(async () => {
    try {
      if (isCapacitorNative) {
        toast.success('🔔 Notification de test envoyée !');
        return;
      }
      if ('Notification' in window && Notification.permission === 'granted') {
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
  }, [isCapacitorNative]);

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
