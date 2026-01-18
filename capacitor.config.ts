import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.educatok.islahmedia',
  appName: 'EducaTok',
  webDir: 'dist',
  // Mode embarqué : pas de server.url pour que le push natif fonctionne
  // Le build Vite est inclus directement dans l'APK
  
  // Configuration des App Links / Deep Links
  plugins: {
    App: {
      // Liste des domaines autorisés pour les deep links
    }
  },
  
  // Android specific configuration
  android: {
    // Permet la vérification automatique des App Links
    allowMixedContent: false,
  }
};

export default config;
