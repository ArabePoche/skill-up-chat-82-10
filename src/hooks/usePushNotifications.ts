import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Configuration Firebase
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDqD_qUgKqyJQ-QV-YQX5lNdYkRZYQO_aI",
  authDomain: "eductok-a2a00.firebaseapp.com",
  projectId: "eductok-a2a00",
  storageBucket: "eductok-a2a00.firebasestorage.app",
  messagingSenderId: "965625094073",
  appId: "1:965625094073:web:f44b6b0b78d6b7b5c49e3b"
};

// VAPID Key pour FCM
const VAPID_KEY = "BKpG_ZBtTf4vN8MhG_kFKY3CdOF6JO7O_HdPQvP4mFqY2hKgF8XzVvB2qG3nDuE5JvHYR6gTpP7-N9LmQ0W1x8M";

export interface NotificationPreferences {
  daily_reminders: boolean;
  teacher_responses: boolean;
  exercise_validation: boolean;
  new_lessons: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    daily_reminders: true,
    teacher_responses: true,
    exercise_validation: true,
    new_lessons: true
  });

  // Vérifier le support des notifications
  const isSupported = () => {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  };

  // Demander la permission pour les notifications
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported()) {
      toast.error('Les notifications push ne sont pas supportées sur ce navigateur');
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasPermission(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      toast.error('Les notifications ont été refusées. Veuillez les autoriser dans les paramètres du navigateur.');
      setHasPermission(false);
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        toast.success('🎉 Notifications activées ! Vous recevrez des rappels motivants pour vos études.');
        await initializeFCM();
      } else {
        toast.error('Permissions refusées. Vous pouvez les activer plus tard dans les paramètres.');
      }
      
      return granted;
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      toast.error('Erreur lors de l\'activation des notifications');
      return false;
    }
  };

  // Initialiser Firebase Cloud Messaging
  const initializeFCM = async () => {
    if (!hasPermission || !user?.id) return;

    try {
      setIsLoading(true);

      // Importer Firebase dynamiquement
      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      // Initialiser Firebase
      const app = initializeApp(FIREBASE_CONFIG);
      const messaging = getMessaging(app);

      // Enregistrer le Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        // Obtenir le token FCM
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (token) {
          setFcmToken(token);
          await saveFCMToken(token);
          console.log('FCM Token:', token);
        } else {
          console.error('Aucun token FCM disponible');
          toast.error('Impossible d\'obtenir le token de notification');
        }

        // Écouter les messages en foreground
        onMessage(messaging, (payload) => {
          console.log('Message reçu en foreground:', payload);
          
          if (payload.notification) {
            toast.info(payload.notification.title || 'Nouvelle notification', {
              description: payload.notification.body,
              duration: 5000,
            });
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation FCM:', error);
      toast.error('Erreur lors de la configuration des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarder le token FCM en base
  const saveFCMToken = async (token: string) => {
    if (!user?.id) return;

    try {
      // Supprimer les anciens tokens pour cet utilisateur
      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Insérer le nouveau token
      const { error } = await supabase
        .from('push_tokens')
        .insert({
          user_id: user.id,
          token: token,
          device_type: 'web',
          is_active: true,
          notification_preferences: preferences as any
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde du token:', error);
        toast.error('Erreur lors de l\'enregistrement du token');
      } else {
        console.log('Token FCM sauvegardé avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  // Mettre à jour les préférences
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.id || !fcmToken) return;

    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    try {
      const { error } = await supabase
        .from('push_tokens')
        .update({ notification_preferences: updatedPreferences as any })
        .eq('user_id', user.id)
        .eq('token', fcmToken)
        .eq('is_active', true);

      if (error) {
        console.error('Erreur lors de la mise à jour des préférences:', error);
        toast.error('Erreur lors de la sauvegarde des préférences');
      } else {
        toast.success('Préférences mises à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Désactiver les notifications
  const disableNotifications = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) {
        console.error('Erreur lors de la désactivation:', error);
        toast.error('Erreur lors de la désactivation');
      } else {
        setHasPermission(false);
        setFcmToken(null);
        toast.success('Notifications désactivées');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Envoyer une notification de test
  const sendTestNotification = async () => {
    if (!fcmToken || !user?.id) {
      toast.error('Token FCM non disponible');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userIds: [user.id],
          title: '🎯 Test de notification',
          message: 'Super ! Vos notifications fonctionnent parfaitement. Prêt à apprendre ?',
          type: 'test'
        }
      });

      if (error) {
        console.error('Erreur lors de l\'envoi du test:', error);
        toast.error('Erreur lors de l\'envoi du test');
      } else {
        toast.success('Notification de test envoyée !');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'envoi du test');
    }
  };

  // Initialisation au chargement
  useEffect(() => {
    if (!isSupported()) {
      setHasPermission(false);
      return;
    }

    setHasPermission(Notification.permission === 'granted');
  }, []);

  useEffect(() => {
    if (hasPermission && user?.id && !fcmToken) {
      initializeFCM();
    }
  }, [hasPermission, user?.id]);

  return {
    hasPermission,
    fcmToken,
    isLoading,
    preferences,
    isSupported: isSupported(),
    requestPermission,
    updatePreferences,
    disableNotifications,
    sendTestNotification
  };
};