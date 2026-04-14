/**
 * NotificationService
 *
 * Rôle:
 * - Persister le token push côté DB (table public.push_tokens)
 * - Déclencher une notification de test via edge function
 * 
 * IMPORTANT: Le device_type détermine comment FCM envoie les notifications:
 * - 'android' → FCM natif Android
 * - 'ios' → APNS via FCM
 * - 'web' → Web Push
 */
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

const isDevelopment = import.meta.env.DEV;

/**
 * Détecte le type d'appareil de manière fiable
 * Utilise Capacitor.getPlatform() qui est la source de vérité
 */
const getDeviceType = (): 'android' | 'ios' | 'web' => {
  try {
    const platform = Capacitor.getPlatform();
    console.log('🔍 [NotificationService] Capacitor.getPlatform():', platform);
    console.log('🔍 [NotificationService] Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
    
    if (platform === 'android') {
      console.log('✅ [NotificationService] Détecté: Android natif');
      return 'android';
    }
    if (platform === 'ios') {
      console.log('✅ [NotificationService] Détecté: iOS natif');
      return 'ios';
    }
  } catch (e) {
    console.warn('⚠️ [NotificationService] Erreur détection Capacitor:', e);
  }
  
  console.log('🌐 [NotificationService] Détecté: Web');
  return 'web';
};

export const NotificationService = {
  /**
   * Sauvegarde le token push en base de données
   * Le device_type est automatiquement détecté
   */
  async saveToken(userId: string, token: string): Promise<void> {
    const deviceType = getDeviceType();

    if (isDevelopment) {
      console.log('💾 [NotificationService] Saving push token', {
        deviceType,
      });
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          device_type: deviceType,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          // IMPORTANT: On utilise user_id comme contrainte unique
          // Cela signifie qu'un utilisateur ne peut avoir qu'un seul token actif
          // Si on veut supporter plusieurs appareils, il faudrait changer la contrainte
          onConflict: 'user_id',
        }
      );

    if (error) {
      console.error('❌ [NotificationService] Erreur sauvegarde token:', error);
      throw error;
    }
    
    if (isDevelopment) {
      console.log('✅ [NotificationService] Push token saved successfully', {
        deviceType,
      });
    }
  },

  /**
   * Envoie une notification de test via l'edge function
   */
  async sendTestNotification(userId: string, token: string): Promise<void> {
    if (isDevelopment) {
      console.log('🧪 [NotificationService] Sending test notification');
    }

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds: [userId],
        title: '🎉 Test de notification !',
        message: 'Si tu vois ce message, les notifications fonctionnent parfaitement !',
        type: 'test',
        data: {
          url: '/',
        },
      },
    });

    if (error) {
      console.error('❌ [NotificationService] Erreur envoi notification test:', error);
      throw error;
    }
    
    console.log('✅ [NotificationService] Notification de test envoyée!');
  },
};
