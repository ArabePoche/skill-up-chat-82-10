/**
 * Configuration i18n pour le support multilingue
 * Langues supportées : français, anglais, arabe, espagnol
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';
import es from './locales/es.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  ar: { translation: ar },
  es: { translation: es }
};

// Ne pas initialiser immédiatement, attendre que React soit monté
let isInitialized = false;

export const initI18n = () => {
  if (isInitialized) return;
  
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'fr',
      supportedLngs: ['fr', 'en', 'ar', 'es'],
      interpolation: {
        escapeValue: false
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage']
      },
      react: {
        useSuspense: false
      }
    });

  // Support RTL pour l'arabe
  i18n.on('languageChanged', (lng) => {
    const dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
  });
  
  isInitialized = true;
};

export default i18n;
