
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
        tokens: [token],
        title: '🎉 Test de notification !',
        body: 'Si tu vois ce message, les notifications fonctionnent parfaitement !',
        data: {
          type: 'test',
          url: '/'
        }
      }
    });

    if (error) {
      console.error('Erreur envoi notification test:', error);
      throw error;
    }
  }
};