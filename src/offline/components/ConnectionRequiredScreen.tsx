/**
 * Écran affiché quand l'app n'a jamais été ouverte en ligne
 * et que l'utilisateur est hors connexion
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConnectionRequiredScreenProps {
  onRetry: () => Promise<boolean>;
  isFirstRun: boolean;
}

export const ConnectionRequiredScreen: React.FC<ConnectionRequiredScreenProps> = ({
  onRetry,
  isFirstRun,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  // Vérification automatique périodique
  useEffect(() => {
    const interval = setInterval(async () => {
      const isOnline = navigator.onLine;
      if (isOnline) {
        setIsChecking(true);
        const reallyOnline = await onRetry();
        if (reallyOnline) {
          window.location.reload();
        }
        setIsChecking(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onRetry]);

  const handleRetry = async () => {
    setIsChecking(true);
    setCheckCount(prev => prev + 1);
    
    try {
      const isConnected = await onRetry();
      if (isConnected) {
        window.location.reload();
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icône animée */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-destructive/10 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-destructive/20 animate-pulse [animation-delay:150ms]" />
          <div className="absolute inset-8 rounded-full bg-destructive/30 flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-destructive" />
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Connexion requise
          </h1>
          <p className="text-muted-foreground">
            {isFirstRun
              ? "Cette application nécessite une connexion internet pour être utilisée la première fois."
              : "Veuillez vous connecter à internet pour continuer."
            }
          </p>
        </div>

        {/* Explication */}
        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-medium text-primary">1</span>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Première connexion</p>
              <p className="text-xs text-muted-foreground">
                L'app télécharge le contenu pour fonctionner hors ligne
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-medium text-primary">2</span>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Mode hors ligne</p>
              <p className="text-xs text-muted-foreground">
                Après cette étape, vous pourrez utiliser l'app sans connexion
              </p>
            </div>
          </div>
        </div>

        {/* Statut de connexion */}
        <div className={cn(
          "flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium transition-colors",
          navigator.onLine 
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-destructive/10 text-destructive"
        )}>
          {navigator.onLine ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Connexion détectée</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Aucune connexion</span>
            </>
          )}
        </div>

        {/* Bouton de retry */}
        <Button
          onClick={handleRetry}
          disabled={isChecking}
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          {isChecking ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Vérification...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Réessayer la connexion
            </>
          )}
        </Button>

        {/* Message d'aide */}
        {checkCount > 2 && (
          <p className="text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
            💡 Vérifiez votre connexion WiFi ou données mobiles
          </p>
        )}

        {/* Logo */}
        <div className="pt-8">
          <p className="text-sm font-semibold text-muted-foreground">
            EducaTok
          </p>
        </div>
      </div>
    </div>
  );
};
