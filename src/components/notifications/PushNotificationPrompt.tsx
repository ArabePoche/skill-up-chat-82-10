/**
 * PushNotificationPrompt
 * 
 * Popup incitatif affiché une seule fois après connexion pour encourager
 * l'utilisateur à activer les notifications push.
 * Utilise localStorage pour ne pas réafficher si déjà vu/accepté.
 */
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { nativePushService } from '@/services/NativePushService';
import { NotificationService } from '@/services/NotificationService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const PROMPT_KEY = 'push_notification_prompt_seen';

export const PushNotificationPrompt: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Ne pas afficher si déjà vu
    const alreadySeen = localStorage.getItem(PROMPT_KEY);
    if (alreadySeen) return;

    // Vérifier si les notifications sont supportées
    if (!nativePushService.isSupported()) return;

    // Vérifier si la permission est déjà accordée
    nativePushService.getPermissionStatus().then((status) => {
      if (status === 'granted') {
        // Déjà activé, marquer comme vu
        localStorage.setItem(PROMPT_KEY, 'granted');
        return;
      }
      if (status === 'denied') {
        // Refusé au niveau OS, pas la peine d'afficher
        localStorage.setItem(PROMPT_KEY, 'denied');
        return;
      }
      // Afficher le popup après un court délai (laisser l'app charger)
      const timer = setTimeout(() => setOpen(true), 3000);
      return () => clearTimeout(timer);
    });
  }, [user]);

  const handleActivate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const result = await nativePushService.initialize();

      if (result.success && result.token) {
        await NotificationService.saveToken(user.id, result.token);
        toast.success('🎉 Notifications activées !');
        localStorage.setItem(PROMPT_KEY, 'granted');
      } else if (result.success) {
        // Token arrivera plus tard via listener
        toast.success('🔔 Notifications en cours d\'activation...');
        localStorage.setItem(PROMPT_KEY, 'granted');
      } else {
        toast.error(result.error || 'Impossible d\'activer les notifications');
        localStorage.setItem(PROMPT_KEY, 'later');
      }
    } catch (err) {
      console.error('❌ Erreur activation notifications:', err);
      toast.error('Erreur lors de l\'activation');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_KEY, 'later');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Ne ratez rien ! 🔔
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            Activez les notifications pour recevoir les dernières formations, 
            promotions et messages importants directement sur votre appareil.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleActivate}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            <Bell className="h-5 w-5" />
            {loading ? 'Activation...' : 'Activer les notifications'}
          </Button>

          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full gap-2 text-muted-foreground"
          >
            <BellOff className="h-4 w-4" />
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
