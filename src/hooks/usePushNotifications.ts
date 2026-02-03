/**
 * Hook pour gérer les notifications push
 * 
 * Utilise NativePushService qui gère automatiquement:
 * - Android/iOS → Push natif Capacitor
 * - Web → Firebase FCM
 */
import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NotificationService } from '@/services/NotificationService';
import { nativePushService } from '@/services/NativePushService';
import { NotificationSoundService } from '@/services/NotificationSoundService';

export interface NotificationPreferences {
  daily_reminders: boolean;
  teacher_responses: boolean;
  exercise_validation: boolean;
  new_lessons: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    daily_reminders: true,
    teacher_responses: true,
    exercise_validation: true,
    new_lessons: true
  });

  useEffect(() => {
    const checkSupport = async () => {
      // Petit délai pour s'assurer que Capacitor est prêt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const supported = nativePushService.isSupported();
      console.log('📱 Notifications supportées:', supported);
      console.log('🖥️ Plateforme:', Capacitor.getPlatform());
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = await nativePushService.getPermissionStatus();
        console.log('🔐 Permission actuelle:', currentPermission);
        if (currentPermission !== 'unknown') {
          setPermission(currentPermission as NotificationPermission);
        }
        loadUserPreferences();
        
        // Précharger les sons de notification (ignoré sur mobile natif)
        NotificationSoundService.preloadSounds();
      } else {
        console.warn('⚠️ Notifications non supportées sur cet appareil');
      }
    };

    checkSupport();
  }, [user]);

  /**
   * IMPORTANT (mobile natif): le token peut arriver APRÈS l'appel à requestPermission()
   * (event `registration`). On s'abonne donc aux tokens pour:
   * - mettre à jour le state
   * - persister dans `push_tokens` dès qu'il est disponible
   */
  useEffect(() => {
    if (!user) return;

    const platform = Capacitor.getPlatform();
    const isNativeMobile = platform === 'android' || platform === 'ios';
    if (!isNativeMobile) return;

    return nativePushService.onToken((token) => {
      setFcmToken(token);
      NotificationService.saveToken(user.id, token).catch((error) => {
        console.error('Erreur sauvegarde token (listener natif):', error);
      });
    });
  }, [user?.id]);

  const loadUserPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('push_tokens')
        .select('notification_preferences, token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        if (data.notification_preferences) {
          const prefs = data.notification_preferences as unknown as NotificationPreferences;
          setPreferences(prefs);
        }
        if (data.token) {
          setFcmToken(data.token);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
    }
  }, [user]);

  const requestPermission = useCallback(async () => {
    if (!user) {
      toast.error('❌ Connectez-vous pour activer les notifications');
      return false;
    }

    if (!isSupported) {
      toast.error('Les notifications ne sont pas supportées sur cet appareil');
      return false;
    }

    setIsLoading(true);
    try {
      console.log('🔔 Demande de permission pour les notifications...');
      
      // NativePushService gère automatiquement la bonne méthode selon la plateforme
      const result = await nativePushService.initialize();
      
      if (result.success) {
        setPermission('granted');
        
        if (result.token) {
          setFcmToken(result.token);
          await NotificationService.saveToken(user.id, result.token);
          toast.success('🎉 Notifications activées avec succès !');
        } else {
          // Sur mobile natif, on peut ne pas avoir le token immédiatement
          // mais la permission est accordée
          toast.success('✅ Permission accordée ! (token en cours de récupération…)');
        }
        return true;
      } else {
        console.error('Erreur lors de l\'activation:', result.error);
        toast.error(`❌ ${result.error || 'Erreur lors de la configuration des notifications'}`);
        return false;
      }
    } catch (error) {
      console.error('Erreur inattendue:', error);
      toast.error('❌ Erreur inattendue lors de la configuration des notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;

    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    try {
      await supabase
        .from('push_tokens')
        .update({ 
          notification_preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      toast.success('✅ Préférences mises à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      toast.error('❌ Erreur lors de la mise à jour des préférences');
    }
  }, [user, preferences]);

  const disableNotifications = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('push_tokens')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      setPermission('default');
      setFcmToken(null);
      toast.success('🔕 Notifications désactivées');
    } catch (error) {
      console.error('Erreur lors de la désactivation:', error);
      toast.error('❌ Erreur lors de la désactivation des notifications');
    }
  }, [user]);

  const sendTestNotification = useCallback(async () => {
    if (!user) {
      toast.error('❌ Utilisateur non connecté');
      return;
    }

    const platform = Capacitor.getPlatform();
    const isNativeMobile = platform === 'android' || platform === 'ios';

    try {
      // Jouer le son de notification (ignorer l'erreur si les fichiers audio n'existent pas)
      NotificationSoundService.playNotificationSound('default').catch(() => {
        console.log('Sons de notification non disponibles');
      });

      // Sur mobile natif, ne PAS utiliser l'API Notification du navigateur
      if (!isNativeMobile && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const localNotif = new Notification('🎯 Test immédiat', {
          body: 'Notification locale fonctionnelle !',
          icon: '/icon-192.png',
          badge: '/badge-72.png'
        });
        setTimeout(() => localNotif.close(), 3000);
      }

      // Un push "réel" nécessite un token en base (push_tokens).
      if (!fcmToken) {
        toast.warning('⚠️ Token push indisponible. Réessayez dans quelques secondes.');
        return;
      }

      await NotificationService.sendTestNotification(user.id, fcmToken);
      toast.success('🎯 Notification de test envoyée !');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de test:', error);
      toast.error('❌ Erreur lors de l\'envoi de la notification de test');
    }
  }, [fcmToken, user]);

  // Computed property for hasPermission
  // Sur mobile natif, seule la permission suffit (pas besoin de token FCM web)
  const platform = Capacitor.getPlatform();
  const isNativeMobile = platform === 'android' || platform === 'ios';
  const hasPermission = permission === 'granted' && (isNativeMobile || !!fcmToken);

  return {
    isSupported,
    permission,
    fcmToken,
    isLoading,
    preferences,
    hasPermission,
    requestPermission,
    updatePreferences,
    disableNotifications,
    sendTestNotification
  };
};