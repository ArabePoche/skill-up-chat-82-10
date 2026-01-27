/**
 * Bannière affichée quand Supabase est inaccessible
 * Informe l'utilisateur qu'il est en mode offline
 */

import { useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const OfflineAuthBanner = () => {
  const { isOfflineMode, supabaseError, retryConnection, user } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState(false);

  // Ne pas afficher si pas en mode offline ou pas d'utilisateur
  if (!isOfflineMode || !user) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetrySuccess(false);
    
    try {
      await retryConnection();
      // Si on n'est plus en mode offline après retry, c'est un succès
      setRetrySuccess(true);
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 px-4 py-2",
      "bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm",
      "text-white shadow-lg"
    )}>
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
            {retrySuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              Mode hors ligne
            </span>
            <span className="text-xs opacity-80">
              {supabaseError || 'Données en cache utilisées'}
            </span>
          </div>
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="bg-white/20 hover:bg-white/30 text-white border-0 gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isRetrying && "animate-spin")} />
          <span className="hidden sm:inline">
            {isRetrying ? 'Connexion...' : 'Réessayer'}
          </span>
        </Button>
      </div>
    </div>
  );
};

/**
 * Écran affiché quand l'utilisateur n'est pas connecté et qu'on est en mode offline
 * sans session cachée
 */
export const OfflineNoSessionScreen = () => {
  const { retryConnection } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryConnection();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-amber-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-3">
          Connexion requise
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Le service est temporairement inaccessible et vous n'avez pas de session enregistrée.
          Veuillez réessayer quand le service sera rétabli.
        </p>
        
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isRetrying && "animate-spin")} />
          {isRetrying ? 'Tentative de connexion...' : 'Réessayer la connexion'}
        </Button>
      </div>
    </div>
  );
};
