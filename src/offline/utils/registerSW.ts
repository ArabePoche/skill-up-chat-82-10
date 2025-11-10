/**
 * Enregistrement du Service Worker avec vite-plugin-pwa
 * Utilise le module auto-généré par vite-plugin-pwa
 */

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      console.log('🔧 Démarrage enregistrement Service Worker...');
      
      // Importer le module d'enregistrement généré par vite-plugin-pwa
      const { registerSW } = await import('virtual:pwa-register');
      
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('🔄 Nouvelle version disponible');
        },
        onOfflineReady() {
          console.log('✅ Application prête pour le mode offline');
          // Notifier l'utilisateur
          if (window.location.pathname !== '/auth') {
            console.log('📱 Vous pouvez maintenant utiliser l\'app hors ligne');
          }
        },
        onRegistered(registration) {
          console.log('✅ Service Worker enregistré:', registration);
          
          // Vérifier si le SW est actif
          if (registration?.active) {
            console.log('✅ Service Worker actif et opérationnel');
          } else {
            console.log('⏳ Service Worker en cours d\'activation...');
          }
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
      
      // Test de connectivité offline
      window.addEventListener('online', () => {
        console.log('🌐 Connexion Internet rétablie');
      });
      
      window.addEventListener('offline', () => {
        console.log('📵 Mode hors ligne activé');
      });
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement du Service Worker:', error);
      console.error('Détails:', error);
    }
  } else {
    console.warn('⚠️ Service Worker non supporté par ce navigateur');
  }
};
