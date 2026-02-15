import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Settings, TestTube } from 'lucide-react';
import { usePushNotifications, NotificationPreferences } from '@/hooks/usePushNotifications';

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationPermissionDialog: React.FC<NotificationPermissionDialogProps> = ({
  open,
  onOpenChange
}) => {
  const {
    hasPermission,
    isLoading,
    preferences,
    isSupported,
    requestPermission,
    updatePreferences,
    disableNotifications,
    sendTestNotification,
    currentToken
  } = usePushNotifications();

  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      onOpenChange(false);
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...localPreferences, [key]: value };
    setLocalPreferences(newPreferences);
    await updatePreferences({ [key]: value });
  };

  const handleDisable = async () => {
    await disableNotifications();
    onOpenChange(false);
  };

  if (!isSupported) {
    // Détecter la plateforme pour un message adapté
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isCapacitorNative = typeof (window as any).Capacitor !== 'undefined' &&
      ((window as any).Capacitor.getPlatform?.() === 'android' ||
        (window as any).Capacitor.getPlatform?.() === 'ios');

    // Si on est sur Capacitor natif, ne pas afficher ce message d'erreur
    // car isSupported devrait être true sur mobile natif
    // Ce cas ne devrait pas arriver normalement
    console.warn('⚠️ isSupported=false mais on est peut-être sur mobile:', {
      isIOS,
      isCapacitorNative,
      userAgent: navigator.userAgent
    });

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellOff className="w-5 h-5 text-gray-500" />
              Notifications non disponibles
            </DialogTitle>
            <DialogDescription>
              {isCapacitorNative ? (
                <>
                  Veuillez vérifier que les notifications sont autorisées dans les paramètres de votre appareil.
                </>
              ) : isIOS ? (
                <>
                  Pour recevoir les notifications sur iPhone/iPad, installez l'application sur votre écran d'accueil :
                  <br />
                  <strong>Safari → Partager → "Sur l'écran d'accueil"</strong>
                </>
              ) : (
                <>
                  Les notifications ne sont pas disponibles dans ce contexte.
                  Essayez avec Chrome, Firefox, Edge ou Samsung Internet.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notifications Push
          </DialogTitle>
          <DialogDescription>
            Recevez des rappels motivants pour ne jamais manquer vos études,
            comme sur Duolingo ! 🎯
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {hasPermission === null || hasPermission === false ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900 mb-2">
                  🚀 Pourquoi activer les notifications ?
                </h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• 📚 Rappels quotidiens pour étudier (comme Duolingo)</li>
                  <li>• ✅ Alertes quand vos exercices sont validés</li>
                  <li>• 💬 Notifications quand un prof vous répond</li>
                  <li>• 🆕 Alerts pour les nouveaux cours disponibles</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handlePermissionRequest}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Configuration...' : '🔔 Activer les notifications'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Plus tard
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Notifications activées
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestNotification}
                  className="text-green-700 border-green-300"
                >
                  <TestTube className="w-4 h-4 mr-1" />
                  Test
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">Préférences</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="daily_reminders" className="text-sm">
                      📅 Rappels quotidiens d'étude
                    </Label>
                    <Switch
                      id="daily_reminders"
                      checked={localPreferences.daily_reminders}
                      onCheckedChange={(value) => handlePreferenceChange('daily_reminders', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="teacher_responses" className="text-sm">
                      💬 Réponses des professeurs
                    </Label>
                    <Switch
                      id="teacher_responses"
                      checked={localPreferences.teacher_responses}
                      onCheckedChange={(value) => handlePreferenceChange('teacher_responses', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="exercise_validation" className="text-sm">
                      ✅ Validation d'exercices
                    </Label>
                    <Switch
                      id="exercise_validation"
                      checked={localPreferences.exercise_validation}
                      onCheckedChange={(value) => handlePreferenceChange('exercise_validation', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="new_lessons" className="text-sm">
                      🆕 Nouveaux cours disponibles
                    </Label>
                    <Switch
                      id="new_lessons"
                      checked={localPreferences.new_lessons}
                      onCheckedChange={(value) => handlePreferenceChange('new_lessons', value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleDisable}
                  className="flex-1"
                >
                  Désactiver
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}

          {/* DEBUG SECTION */}
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono break-all">
            <p><strong>Debug Info:</strong></p>
            <p>Platform: {isSupported ? 'Supported' : 'Not Supported'}</p>
            <p>Permission: {String(hasPermission)}</p>
            <p>Token: {currentToken || 'No token'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPermissionDialog;