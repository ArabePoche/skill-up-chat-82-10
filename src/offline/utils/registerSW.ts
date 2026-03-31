/**
 * Enregistrement du Service Worker avec vite-plugin-pwa
 * Utilise le module auto-généré par vite-plugin-pwa
 */

// Variable pour stocker la fonction de mise à jour
let updateSWFunction: ((reload?: boolean) => Promise<void>) | null = null;

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker non supporté par ce navigateur');
    return;
  }

  if (!import.meta.env.PROD) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }

    try {
      localStorage.removeItem('pwa_offline_ready');
      localStorage.removeItem('pwa_offline_ready_date');
      sessionStorage.clear();
    } catch {
      // Ignore storage cleanup failures in development.
    }

    console.log('🧹 Service Worker et caches désactivés en développement');

    if (hadController) {
      window.location.reload();
    }

    return;
  }

  try {
    console.log('🔧 Démarrage enregistrement Service Worker...');
    
    // Importer le module d'enregistrement généré par vite-plugin-pwa
    const { registerSW } = await import('virtual:pwa-register');
    
    updateSWFunction = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('🔄 Nouvelle version disponible - rechargement automatique');
        // Recharger automatiquement pour appliquer la mise à jour
        if (updateSWFunction) {
          updateSWFunction(true);
        }
      },
      onOfflineReady() {
        console.log('✅ Application prête pour le mode offline');
        // Marquer dans localStorage que l'app est prête pour offline
        try {
          localStorage.setItem('pwa_offline_ready', 'true');
          localStorage.setItem('pwa_offline_ready_date', new Date().toISOString());
        } catch (e) {
          console.warn('Impossible de sauvegarder le statut offline');
        }
      },
      onRegistered(registration) {
        console.log('✅ Service Worker enregistré:', registration?.scope);
        
        // Vérifier périodiquement les mises à jour (toutes les heures)
        if (registration) {
          setInterval(() => {
            console.log('🔄 Vérification des mises à jour du SW...');
            registration.update();
          }, 60 * 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.error('❌ Erreur lors de l\'enregistrement du SW:', error);
      }
    });

    console.log('✅ PWA Service Worker activé');
    
  } catch (error) {
    console.error('❌ Erreur lors du chargement du Service Worker:', error);

    // Fallback: essayer d'enregistrer le SW manuellement
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('✅ SW enregistré manuellement:', registration.scope);
    } catch (fallbackError) {
      console.error('❌ Fallback SW aussi échoué:', fallbackError);
    }
  }
};

// Fonction utilitaire pour vérifier si le SW est prêt
export const isOfflineReady = (): boolean => {
  try {
    return localStorage.getItem('pwa_offline_ready') === 'true';
  } catch {
    return false;
  }
};

// Fonction pour forcer une mise à jour du SW
export const updateServiceWorker = async (): Promise<void> => {
  if (updateSWFunction) {
    await updateSWFunction(true);
  }
};
