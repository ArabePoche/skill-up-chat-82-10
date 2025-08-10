import { supabase } from '@/integrations/supabase/client';

export const NotificationService = {
  async saveToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

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
          tokenPreview: token?.slice(0, 12)
        }
      }
    });

    if (error) {
      console.error('Erreur envoi notification test:', error);
      throw error;
    }
  }
};