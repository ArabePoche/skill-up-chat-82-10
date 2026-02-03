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

    console.log('💾 [NotificationService] Sauvegarde token push:', {
      userId: userId.substring(0, 8) + '...',
      tokenPreview: token.substring(0, 20) + '...',
      deviceType,
      timestamp: new Date().toISOString(),
    });

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
    
    console.log('✅ [NotificationService] Token sauvegardé avec succès!', {
      deviceType,
      tokenPreview: token.substring(0, 20) + '...',
    });
  },

  /**
   * Envoie une notification de test via l'edge function
   */
  async sendTestNotification(userId: string, token: string): Promise<void> {
    console.log('🧪 [NotificationService] Envoi notification de test:', {
      userId: userId.substring(0, 8) + '...',
      tokenPreview: token.substring(0, 20) + '...',
    });

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds: [userId],
        title: '🎉 Test de notification !',
        message: 'Si tu vois ce message, les notifications fonctionnent parfaitement !',
        type: 'test',
        data: {
          url: '/',
          tokenPreview: token?.slice(0, 12),
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
