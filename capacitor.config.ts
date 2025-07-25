import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.educatok.islahmedia',
  appName: 'EducaTok',
  webDir: 'dist',
  server: {
    url: 'https://educatok.netlify.app'
    cleartext: true
  }
};

export default config;
