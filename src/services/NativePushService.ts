/**
 * NativePushService - Service unifié pour les notifications push
 * 
 * ARCHITECTURE:
 * - Android/iOS Capacitor → Push natif via @capacitor/push-notifications
 * - Web (navigateur réel) → Firebase FCM Web + Service Worker
 * 
 * RÈGLE D'OR: Une app Capacitor NE DOIT JAMAIS exécuter du code push web
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { NotificationService } from './NotificationService';

/**
 * Détection STRICTE de la plateforme native
 * Utilise Capacitor.getPlatform() qui est la seule méthode fiable
 */
const detectPlatformType = (): 'android' | 'ios' | 'web' => {
  try {
    const platform = Capacitor.getPlatform();
    console.log('🔍 Capacitor.getPlatform():', platform);
    
    if (platform === 'android' || platform === 'ios') {
      return platform;
    }
  } catch (e) {
    console.warn('⚠️ Erreur détection plateforme Capacitor:', e);
  }
  return 'web';
};

/**
 * Vérifie si le plugin PushNotifications est disponible
 */
const isPushNotificationsAvailable = (): boolean => {
  try {
    return !!PushNotifications && typeof PushNotifications.requestPermissions === 'function';
  } catch {
    return false;
  }
};

export class NativePushService {
  private static instance: NativePushService;
  private _platformType: 'android' | 'ios' | 'web' | null = null;
  private initPromise: Promise<void> | null = null;

  static getInstance(): NativePushService {
    if (!NativePushService.instance) {
      NativePushService.instance = new NativePushService();
    }
    return NativePushService.instance;
  }

  constructor() {
    // Initialisation lazy - on ne détecte pas tout de suite
    console.log('🔧 NativePushService créé (détection lazy)');
  }

  /**
   * Obtient la plateforme détectée (avec cache)
   * Force le refresh si demandé
   */
  private getPlatformType(forceRefresh = false): 'android' | 'ios' | 'web' {
    if (this._platformType === null || forceRefresh) {
      this._platformType = detectPlatformType();
      console.log('📱 Plateforme détectée:', this._platformType);
    }
    return this._platformType;
  }

  /**
   * Vérifie si on est sur une plateforme mobile native (Android/iOS)
   */
  isNativeMobile(): boolean {
    const platform = this.getPlatformType();
    return platform === 'android' || platform === 'ios';
  }

  /**
   * Vérifie si les notifications sont supportées sur cette plateforme
   * IMPORTANT: Sur mobile natif, c'est TOUJOURS supporté si le plugin est disponible
   */
  isSupported(): boolean {
    // Force refresh de la plateforme pour être sûr
    const platform = this.getPlatformType(true);
    
    console.log('🔍 Vérification support notifications:', {
      platform,
      capacitorPlatform: Capacitor.getPlatform(),
      pushPluginAvailable: isPushNotificationsAvailable(),
    });

    // Sur plateforme native mobile → supporté si le plugin existe
    if (platform === 'android' || platform === 'ios') {
      const pluginAvailable = isPushNotificationsAvailable();
      console.log('📱 Mobile natif détecté, plugin disponible:', pluginAvailable);
      return pluginAvailable;
    }
    
    // Sur le web → vérifier Notification API et Service Worker
    if (typeof window !== 'undefined') {
      const hasNotificationAPI = 'Notification' in window;
      const hasServiceWorker = 'serviceWorker' in navigator;
      const supported = hasNotificationAPI && hasServiceWorker;
      console.log('🌐 Web détecté:', { hasNotificationAPI, hasServiceWorker, supported });
      return supported;
    }

    console.warn('⚠️ Environnement non reconnu');
    return false;
  }

  /**
   * Initialise le service de notifications selon la plateforme
   * IMPORTANT: Sur mobile natif, on n'utilise JAMAIS le code web
   */
  async initialize(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      // Force refresh pour être sûr d'avoir la bonne plateforme
      const platform = this.getPlatformType(true);
      
      console.log('🚀 Initialisation des notifications...', { 
        platform,
        capacitorPlatform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform(),
      });

      // Détection stricte: Android ou iOS = push natif UNIQUEMENT
      if (platform === 'android' || platform === 'ios') {
        console.log('📱 Utilisation du push natif Capacitor');
        return await this.initializeNative();
      }

      // Web uniquement (navigateur réel, pas WebView Capacitor)
      console.log('🌐 Utilisation du push web FCM');
      return await this.initializeWeb();
    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Initialise les notifications natives (iOS/Android) via Capacitor
   */
  private async initializeNative(): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!isPushNotificationsAvailable()) {
      console.error('❌ Plugin PushNotifications non disponible');
      return { success: false, error: 'Plugin notifications non disponible' };
    }

    try {
      console.log('📱 Initialisation notifications natives Capacitor...');

      // Demander les permissions
      const permissionResult = await PushNotifications.requestPermissions();
      console.log('📋 Résultat permission:', permissionResult);
      
      if (permissionResult.receive !== 'granted') {
        return { success: false, error: 'Permission refusée par l\'utilisateur' };
      }

      // Retourner une promesse qui se résout quand on reçoit le token
      return new Promise((resolve) => {
        // Timeout de sécurité - permission accordée mais pas de token
        const timeout = setTimeout(() => {
          console.warn('⏱️ Timeout: pas de token reçu, mais permission accordée');
          resolve({ success: true });
        }, 15000);

        // Écouter AVANT d'appeler register()
        PushNotifications.addListener('registration', (token: { value: string }) => {
          clearTimeout(timeout);
          console.log('🎯 Token natif FCM reçu:', token.value?.substring(0, 20) + '...');
          resolve({ success: true, token: token.value });
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          clearTimeout(timeout);
          console.error('❌ Erreur enregistrement natif:', error);
          // Même en cas d'erreur d'enregistrement, la permission est accordée
          // L'utilisateur peut quand même recevoir des notifications locales
          resolve({ success: true, error: `Avertissement: ${JSON.stringify(error)}` });
        });

        // Écouter les notifications
        PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
          console.log('📨 Notification reçue (foreground):', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
          console.log('👆 Action sur notification:', notification);
        });

        // Enregistrer APRÈS les listeners
        PushNotifications.register().catch((err: any) => {
          clearTimeout(timeout);
          console.error('❌ Erreur register() native:', err);
          // Permission accordée mais erreur d'enregistrement FCM
          resolve({ success: true, error: `Avertissement registration: ${JSON.stringify(err)}` });
        });
      });
    } catch (error) {
      console.error('❌ Erreur notifications natives:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur native inconnue' 
      };
    }
  }

  /**
   * Initialise les notifications web via Firebase FCM
   * IMPORTANT: Cette méthode ne doit JAMAIS être appelée sur mobile natif
   */
  private async initializeWeb(): Promise<{ success: boolean; token?: string; error?: string }> {
    console.log('🌐 Initialisation notifications web (FCM)...');
    
    // Vérifications préliminaires
    if (typeof window === 'undefined') {
      return { success: false, error: 'Environnement non-browser' };
    }
    
    if (!('Notification' in window)) {
      return { success: false, error: 'API Notification non disponible' };
    }
    
    if (!('serviceWorker' in navigator)) {
      return { success: false, error: 'Service Worker non disponible' };
    }
    
    // Import dynamique de FCMService uniquement sur le web
    try {
      const { FCMService } = await import('./FCMService');
      return await FCMService.requestPermission();
    } catch (error) {
      console.error('❌ Erreur import FCMService:', error);
      return { 
        success: false, 
        error: 'Impossible de charger le service de notifications web' 
      };
    }
  }

  /**
   * Sauvegarde le token de notification pour l'utilisateur
   */
  async saveTokenForUser(userId: string, token: string): Promise<void> {
    await NotificationService.saveToken(userId, token);
  }

  /**
   * Envoie une notification de test
   */
  async sendTestNotification(userId: string, token: string): Promise<void> {
    await NotificationService.sendTestNotification(userId, token);
  }

  /**
   * Obtient l'état actuel des permissions
   */
  async getPermissionStatus(): Promise<NotificationPermission | 'unknown'> {
    const platform = this.getPlatformType(true);
    
    // Mobile natif: utiliser Capacitor PushNotifications
    if (platform === 'android' || platform === 'ios') {
      try {
        if (!isPushNotificationsAvailable()) {
          return 'unknown';
        }
        const result = await PushNotifications.checkPermissions();
        console.log('📋 Status permission native:', result);
        return result.receive === 'granted' ? 'granted' : 
               result.receive === 'denied' ? 'denied' : 'default';
      } catch (error) {
        console.error('Erreur vérification permission native:', error);
        return 'unknown';
      }
    }
    
    // Web: utiliser l'API Notification du navigateur
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    
    return 'unknown';
  }
}

// Export d'une instance singleton
export const nativePushService = NativePushService.getInstance();
