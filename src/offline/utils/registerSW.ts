/**
 * Enregistrement du Service Worker avec vite-plugin-pwa
 * Utilise le module auto-généré par vite-plugin-pwa
 */

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Importer le module d'enregistrement généré par vite-plugin-pwa
      const { registerSW } = await import('virtual:pwa-register');
      
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('🔄 Nouvelle version disponible');
        },
        onOfflineReady() {
          console.log('✅ Application prête pour le mode offline');
        },
        onRegistered(registration) {
          console.log('✅ Service Worker enregistré:', registration);
        },
        onRegisterError(error) {
          console.error('❌ Erreur lors de l\'enregistrement du SW:', error);
        }
      });

      // Vérifier les mises à jour toutes les heures
      setInterval(() => {
        updateSW(true);
      }, 60 * 60 * 1000);

      console.log('✅ PWA Service Worker activé');
    } catch (error) {
      console.error('❌ Erreur lors du chargement du Service Worker:', error);
    }
  } else {
    console.warn('⚠️ Service Worker non supporté par ce navigateur');
  }
};
