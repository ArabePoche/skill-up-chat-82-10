/**
 * Hook pour gérer les Deep Links / Android App Links
 * 
 * Ce hook écoute les événements d'URL entrantes (deep links) et
 * redirige l'utilisateur vers la bonne page de l'application.
 */

import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Types de routes supportées par les deep links
interface DeepLinkRoute {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray) => string;
}

// Configuration des routes deep link
const DEEP_LINK_ROUTES: DeepLinkRoute[] = [
  // Vidéos: /video/123 ou /videos/123
  {
    pattern: /\/(video|videos)\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/video/${matches[2]}`
  },
  // Posts: /post/123
  {
    pattern: /\/post\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/post/${matches[1]}`
  },
  // Formations: /formation/123
  {
    pattern: /\/formation\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/formation/${matches[1]}`
  },
  // Profils: /profil/123 ou /profile/123
  {
    pattern: /\/(profil|profile)\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/profil/${matches[2]}`
  },
  // Leçons: /lesson/123
  {
    pattern: /\/lesson\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/lesson/${matches[1]}`
  },
  // Cours: /cours/formation/123
  {
    pattern: /\/cours\/formation\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/cours/formation/${matches[1]}`
  },
  // Conversations: /conversations/123
  {
    pattern: /\/conversations\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/conversations/${matches[1]}`
  },
  // Pages principales
  {
    pattern: /^\/(video|post|search|home|shop|messages|profil)$/,
    handler: (matches) => `/${matches[1]}`
  }
];

/**
 * Parse une URL de deep link et retourne le path interne correspondant
 */
const parseDeepLinkUrl = (urlString: string): string | null => {
  try {
    const url = new URL(urlString);
    const path = url.pathname + url.search + url.hash;
    
    // Chercher une route correspondante
    for (const route of DEEP_LINK_ROUTES) {
      const matches = path.match(route.pattern);
      if (matches) {
        return route.handler(matches);
      }
    }
    
    // Si aucune route spécifique, retourner le path tel quel
    // (en s'assurant qu'il commence par /)
    return path.startsWith('/') ? path : `/${path}`;
  } catch (error) {
    console.error('[DeepLinks] Erreur parsing URL:', error);
    return null;
  }
};

/**
 * Hook principal pour gérer les deep links
 */
export const useDeepLinks = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleDeepLink = useCallback((event: URLOpenListenerEvent) => {
    console.log('[DeepLinks] URL reçue:', event.url);
    
    const internalPath = parseDeepLinkUrl(event.url);
    
    if (internalPath) {
      console.log('[DeepLinks] Navigation vers:', internalPath);
      
      // Éviter la navigation si déjà sur la bonne page
      if (location.pathname !== internalPath) {
        navigate(internalPath, { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    // Ne configurer que sur les plateformes natives
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    console.log('[DeepLinks] Configuration des listeners...');

    // Écouter les événements d'URL (quand l'app est ouverte via un lien)
    const urlListener = App.addListener('appUrlOpen', handleDeepLink);

    // Vérifier si l'app a été lancée avec une URL (cold start)
    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        console.log('[DeepLinks] App lancée avec URL:', launchUrl.url);
        handleDeepLink({ url: launchUrl.url });
      }
    });

    return () => {
      urlListener.then(listener => listener.remove());
    };
  }, [handleDeepLink]);
};

/**
 * Fonction utilitaire pour générer un lien partageable
 * qui fonctionne comme deep link
 */
export const generateShareableLink = (
  path: string,
  baseUrl: string = 'https://educatok.com'
): string => {
  // S'assurer que le path commence par /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Fonction pour générer un lien de partage pour une vidéo
 */
export const generateVideoShareLink = (videoId: string): string => {
  return generateShareableLink(`/video/${videoId}`);
};

/**
 * Fonction pour générer un lien de partage pour un post
 */
export const generatePostShareLink = (postId: string): string => {
  return generateShareableLink(`/post/${postId}`);
};

/**
 * Fonction pour générer un lien de partage pour une formation
 */
export const generateFormationShareLink = (formationId: string): string => {
  return generateShareableLink(`/formation/${formationId}`);
};

/**
 * Fonction pour générer un lien de partage pour un profil
 */
export const generateProfileShareLink = (profileId: string): string => {
  return generateShareableLink(`/profil/${profileId}`);
};

export default useDeepLinks;
