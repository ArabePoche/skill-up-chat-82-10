/**
 * Hook pour attendre que i18n soit prêt avant de rendre les composants
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useI18nReady = () => {
  const { i18n } = useTranslation();
  const [ready, setReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      setReady(true);
    } else {
      const checkReady = () => {
        if (i18n.isInitialized) {
          setReady(true);
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    }
  }, [i18n]);

  return ready;
};
