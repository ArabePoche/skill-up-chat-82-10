/**
 * NotificationService
 *
 * Rôle:
 * - Persister le token push côté DB (table public.push_tokens)
 * - Déclencher une notification de test via edge function
 */
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

const getDeviceType = (): string => {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') return platform;
  return 'web';
};

export const NotificationService = {
  async saveToken(userId: string, token: string): Promise<void> {
    const deviceType = getDeviceType();

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
          // NB: le schéma impose device_type NOT NULL.
          // Si la contrainte unique est seulement sur user_id, on garde cette stratégie.
          onConflict: 'user_id',
        }
      );

    if (error) {
      console.error('Erreur sauvegarde token:', error);
      throw error;
    }
  },

  async sendTestNotification(userId: string, token: string): Promise<void> {
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
      console.error('Erreur envoi notification test:', error);
      throw error;
    }
  },
};
