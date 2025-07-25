
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FCMService } from '@/services/FCMService';
import { NotificationService } from '@/services/NotificationService';

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
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      loadUserPreferences();
    }
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
          // Conversion sécurisée du type Json vers NotificationPreferences
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
    if (!isSupported || !user) return false;

    setIsLoading(true);
    try {
      const result = await FCMService.requestPermission();
      if (result.success && result.token) {
        setPermission('granted');
        setFcmToken(result.token);
        
        await NotificationService.saveToken(user.id, result.token);
        toast.success('Notifications activées avec succès !');
        return true;
      } else {
        toast.error(result.error || 'Erreur lors de la configuration des notifications');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erreur lors de la configuration des notifications');
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

      toast.success('Préférences mises à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      toast.error('Erreur lors de la mise à jour des préférences');
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
      toast.success('Notifications désactivées');
    } catch (error) {
      console.error('Erreur lors de la désactivation:', error);
      toast.error('Erreur lors de la désactivation des notifications');
    }
  }, [user]);

  const sendTestNotification = useCallback(async () => {
    if (!fcmToken || !user) {
      toast.error('Token FCM non disponible');
      return;
    }

    try {
      await NotificationService.sendTestNotification(user.id, fcmToken);
      toast.success('Notification de test envoyée !');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Erreur lors de l\'envoi de la notification de test');
    }
  }, [fcmToken, user]);

  // Computed property for hasPermission
  const hasPermission = permission === 'granted' && fcmToken !== null;

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