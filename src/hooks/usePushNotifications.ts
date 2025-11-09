import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FCMService } from '@/services/FCMService';
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
      const supported = nativePushService.isSupported();
      console.log('📱 Notifications supportées:', supported);
      console.log('🖥️ Plateforme:', navigator.userAgent);
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = await nativePushService.getPermissionStatus();
        console.log('🔐 Permission actuelle:', currentPermission);
        if (currentPermission !== 'unknown') {
          setPermission(currentPermission as NotificationPermission);
        }
        loadUserPreferences();
        
        // Précharger les sons de notification
        NotificationSoundService.preloadSounds();
      } else {
        console.warn('⚠️ Notifications non supportées sur cet appareil');
      }
    };

    checkSupport();
  }, [user]);

  const loadUserPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('push_tokens')
        .select('notification_preferences, token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

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
    if (!isSupported || !user) {
      toast.error('Les notifications ne sont pas supportées sur cet appareil');
      return false;
    }

    setIsLoading(true);
    try {
      console.log('🔔 Demande de permission pour les notifications...');
      
      const result = await nativePushService.initialize();
      
      if (result.success) {
        // Pour les notifications web, utiliser FCM pour obtenir le token
        if (!result.token) {
          const fcmResult = await FCMService.requestPermission();
          if (fcmResult.success && fcmResult.token) {
            result.token = fcmResult.token;
          }
        }

        if (result.token) {
          setPermission('granted');
          setFcmToken(result.token);
          
          await NotificationService.saveToken(user.id, result.token);
          toast.success('🎉 Notifications activées avec succès !');
          return true;
        } else {
          toast.success('✅ Notifications activées !');
          setPermission('granted');
          return true;
        }
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

    try {
      // Afficher d'abord une notification locale immédiate
      if ('Notification' in window && Notification.permission === 'granted') {
        const localNotif = new Notification('🎯 Test immédiat', {
          body: 'Notification locale fonctionnelle !',
          icon: '/icon-192.png',
          badge: '/badge-72.png'
        });
        
        // Jouer le son de notification (ignorer l'erreur si les fichiers audio n'existent pas)
        NotificationSoundService.playNotificationSound('default').catch(() => {
          console.log('Sons de notification non disponibles');
        });
        
        setTimeout(() => localNotif.close(), 3000);
      }

      // Ensuite envoyer via FCM si le token est disponible
      if (fcmToken) {
        await NotificationService.sendTestNotification(user.id, fcmToken);
        toast.success('🎯 Notifications de test envoyées !');
      } else {
        toast.warning('⚠️ Token FCM non disponible, notification locale uniquement');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de test:', error);
      toast.error('❌ Erreur lors de l\'envoi de la notification de test');
    }
  }, [fcmToken, user]);

  // Computed property for hasPermission
  // Sur le web, on exige un token FCM valide pour activer les actions
  const hasPermission = permission === 'granted' && !!fcmToken;

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