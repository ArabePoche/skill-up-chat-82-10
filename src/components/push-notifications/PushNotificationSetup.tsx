import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Bell, BellOff, Check, TestTube } from 'lucide-react';

/**
 * Composant pour configurer et tester les notifications push
 * Permet aux utilisateurs d'activer/désactiver les notifications et de configurer leurs préférences
 */
export const PushNotificationSetup = () => {
  const { user } = useAuth();
  const {
    isSupported,
    permission,
    hasPermission,
    preferences,
    isLoading,
    requestPermission,
    updatePreferences,
    disableNotifications,
    sendTestNotification
  } = usePushNotifications();
  
  const [isTesting, setIsTesting] = useState(false);

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await sendTestNotification();
    } catch (error) {
      console.error('Erreur test notification:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notifications non supportées
          </CardTitle>
          <CardDescription>
            Votre navigateur ne supporte pas les notifications push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications Push
        </CardTitle>
        <CardDescription>
          Restez informé des réponses de vos professeurs et des mises à jour importantes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* État des notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">
              {hasPermission ? 'Notifications activées' : 'Notifications désactivées'}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasPermission 
                ? 'Vous recevrez des notifications push'
                : 'Activez les notifications pour rester informé'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasPermission && <Check className="w-5 h-5 text-green-500" />}
            {!hasPermission && (
              <Button
                onClick={requestPermission}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? 'Configuration...' : 'Activer'}
              </Button>
            )}
          </div>
        </div>

        {/* Préférences de notifications */}
        {hasPermission && (
          <div className="space-y-4">
            <h3 className="font-medium">Préférences de notifications</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="teacher-responses" className="flex-1">
                  <div>
                    <p>Réponses des professeurs</p>
                    <p className="text-sm text-muted-foreground">
                      Quand un professeur répond à vos questions
                    </p>
                  </div>
                </Label>
                <Switch
                  id="teacher-responses"
                  checked={preferences.teacher_responses}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('teacher_responses', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="exercise-validation" className="flex-1">
                  <div>
                    <p>Validation d'exercices</p>
                    <p className="text-sm text-muted-foreground">
                      Quand vos exercices sont validés
                    </p>
                  </div>
                </Label>
                <Switch
                  id="exercise-validation"
                  checked={preferences.exercise_validation}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('exercise_validation', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="new-lessons" className="flex-1">
                  <div>
                    <p>Nouvelles leçons</p>
                    <p className="text-sm text-muted-foreground">
                      Quand de nouvelles leçons sont disponibles
                    </p>
                  </div>
                </Label>
                <Switch
                  id="new-lessons"
                  checked={preferences.new_lessons}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('new_lessons', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="daily-reminders" className="flex-1">
                  <div>
                    <p>Rappels quotidiens</p>
                    <p className="text-sm text-muted-foreground">
                      Rappels pour continuer votre apprentissage
                    </p>
                  </div>
                </Label>
                <Switch
                  id="daily-reminders"
                  checked={preferences.daily_reminders}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('daily_reminders', checked)
                  }
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={isTesting}
                className="flex-1"
              >
                <TestTube className="w-4 h-4 mr-2" />
                {isTesting ? 'Test en cours...' : 'Tester'}
              </Button>
              
              <Button
                variant="destructive"
                onClick={disableNotifications}
                className="flex-1"
              >
                <BellOff className="w-4 h-4 mr-2" />
                Désactiver
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};