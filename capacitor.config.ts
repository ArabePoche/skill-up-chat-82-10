import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.educatok.islahmedia',
  appName: 'EducaTok',
  webDir: 'dist',
  // Mode embarqué : pas de server.url pour que le push natif fonctionne
  // Le build Vite est inclus directement dans l'APK
};
};

export default config;
