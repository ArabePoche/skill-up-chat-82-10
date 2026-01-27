/**
 * Écran de maintenance affiché quand l'application est en cours de réparation
 * À supprimer une fois les problèmes résolus
 */

import React from 'react';
import { Wrench, Clock, Heart } from 'lucide-react';

export const MaintenanceScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icône animée */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary/20 animate-pulse [animation-delay:150ms]" />
          <div className="absolute inset-8 rounded-full bg-primary/30 flex items-center justify-center">
            <Wrench className="w-12 h-12 text-primary animate-[spin_3s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Maintenance en cours 🛠️
          </h1>
          <p className="text-muted-foreground text-lg">
            Nous travaillons dur pour améliorer votre expérience !
          </p>
        </div>

        {/* Message principal */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Retour prévu</span>
          </div>
          
          <p className="text-3xl font-bold text-foreground">
            17 Février 2025
          </p>
          
          <p className="text-sm text-muted-foreground">
            L'application sera de nouveau fonctionnelle au plus tard à cette date.
          </p>
        </div>

        {/* Message de remerciement */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Heart className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-sm">Merci pour votre patience et votre compréhension</span>
        </div>

        {/* Logo */}
        <div className="pt-4 flex flex-col items-center gap-3">
          <img 
            src="/icons/icon-192.webp" 
            alt="EducaTok Logo" 
            className="w-16 h-16 rounded-2xl shadow-lg"
          />
          <div>
            <p className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              EducaTok
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Votre plateforme d'apprentissage interactive
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
