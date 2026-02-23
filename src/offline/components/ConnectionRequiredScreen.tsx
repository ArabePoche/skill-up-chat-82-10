/**
 * Écran informatif affiché quand l'utilisateur est hors connexion
 * Non bloquant — un simple bouton "J'ai compris" pour fermer
 */

import React from 'react';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionRequiredScreenProps {
  onDismiss: () => void;
}

export const ConnectionRequiredScreen: React.FC<ConnectionRequiredScreenProps> = ({
  onDismiss,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icône */}
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
            Vous êtes hors ligne
          </h1>
          <p className="text-muted-foreground">
            Certaines fonctionnalités peuvent être limitées sans connexion internet.
          </p>
        </div>

        {/* Explication */}
        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-medium text-primary">1</span>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Contenus téléchargés</p>
              <p className="text-xs text-muted-foreground">
                Les formations téléchargées restent accessibles hors ligne
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm font-medium text-primary">2</span>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Reconnexion automatique</p>
              <p className="text-xs text-muted-foreground">
                L'app se reconnectera automatiquement dès que le réseau sera disponible
              </p>
            </div>
          </div>
        </div>

        {/* Bouton unique */}
        <Button
          onClick={onDismiss}
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          J'ai compris
        </Button>

        {/* Logo */}
        <div className="pt-4">
          <p className="text-sm font-semibold text-muted-foreground">
            EducaTok
          </p>
        </div>
      </div>
    </div>
  );
};
