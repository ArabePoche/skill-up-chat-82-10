import { Capacitor } from '@capacitor/core';
import { FCMService } from './FCMService';
import { NotificationService } from './NotificationService';

// Import conditionnel pour éviter les erreurs si Capacitor n'est pas disponible
let PushNotifications: any = null;
let capacitorPushAvailable = false;

// Vérifier si on est vraiment sur une plateforme native Capacitor
const isNativePlatform = Capacitor.isNativePlatform();

if (isNativePlatform) {
  try {
    const module = require('@capacitor/push-notifications');
    PushNotifications = module.PushNotifications;
    capacitorPushAvailable = true;
    console.log('✅ Capacitor Push Notifications chargé avec succès');
  } catch (error) {
    console.warn('⚠️ Capacitor Push Notifications non disponible:', error);
  }
}

/**
 * Service unifié pour les notifications push natives (iOS/Android) et web
 * Utilise Capacitor Push pour mobile natif et Firebase FCM pour web/PWA
 */
export class NativePushService {
  private static instance: NativePushService;
  private isNative: boolean;

  static getInstance(): NativePushService {
    if (!NativePushService.instance) {
      NativePushService.instance = new NativePushService();
    }
    return NativePushService.instance;
  }

  constructor() {
    this.isNative = isNativePlatform && capacitorPushAvailable;
    console.log('🔧 NativePushService initialisé:', {
      isNativePlatform,
      capacitorPushAvailable,
      willUseNative: this.isNative
    });
  }

  /**
   * Initialise le service de notifications selon la plateforme
   */
  async initialize(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🚀 Initialisation des notifications...', {
        isNative: this.isNative,
        platform: Capacitor.getPlatform()
      });

      if (this.isNative && PushNotifications) {
        return await this.initializeNative();
      } else {
        return await this.initializeWeb();
      }
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
    if (!PushNotifications) {
      return { success: false, error: 'Capacitor Push Notifications non disponible' };
    }

    try {
      console.log('📱 Initialisation notifications natives Capacitor...');

      // Demander les permissions
      const permissionResult = await PushNotifications.requestPermissions();
      console.log('📋 Résultat permission:', permissionResult);
      
      if (permissionResult.receive === 'granted') {
        // Enregistrer pour recevoir les notifications
        await PushNotifications.register();

        // Retourner une promesse qui se résout quand on reçoit le token
        return new Promise((resolve) => {
          // Timeout au cas où le token ne arrive pas
          const timeout = setTimeout(() => {
            console.warn('⏱️ Timeout: pas de token reçu, mais permission accordée');
            resolve({ success: true });
          }, 10000);

          PushNotifications.addListener('registration', (token: { value: string }) => {
            clearTimeout(timeout);
            console.log('🎯 Token natif FCM reçu:', token.value?.substring(0, 20) + '...');
            resolve({ success: true, token: token.value });
          });

          PushNotifications.addListener('registrationError', (error: any) => {
            clearTimeout(timeout);
            console.error('❌ Erreur enregistrement natif:', error);
            resolve({ success: false, error: `Erreur enregistrement: ${JSON.stringify(error)}` });
          });

          // Écouter les notifications
          PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
            console.log('📨 Notification reçue (foreground):', notification);
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
            console.log('👆 Action sur notification:', notification);
          });
        });
      } else {
        return { success: false, error: 'Permission refusée par l\'utilisateur' };
      }
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
   */
  private async initializeWeb(): Promise<{ success: boolean; token?: string; error?: string }> {
    console.log('🌐 Initialisation notifications web (FCM)...');
    return await FCMService.requestPermission();
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
   * Vérifie si les notifications sont supportées sur cette plateforme
   */
  isSupported(): boolean {
    console.log('🔍 Vérification support notifications:', {
      isNative: this.isNative,
      capacitorPushAvailable,
      platform: Capacitor.getPlatform(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    });

    // Sur plateforme native Capacitor → toujours supporté si le plugin est chargé
    if (this.isNative) {
      console.log('✅ Plateforme native détectée, notifications supportées');
      return true;
    }
    
    // Sur le web → vérifier service worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('✅ Web avec Service Worker, notifications supportées');
      return true;
    }

    console.warn('⚠️ Notifications non supportées sur cette plateforme');
    return false;
  }

  /**
   * Obtient l'état actuel des permissions
   */
  async getPermissionStatus(): Promise<NotificationPermission | 'unknown'> {
    if (this.isNative && PushNotifications) {
      try {
        const result = await PushNotifications.checkPermissions();
        console.log('📋 Status permission native:', result);
        return result.receive === 'granted' ? 'granted' : 
               result.receive === 'denied' ? 'denied' : 'default';
      } catch (error) {
        console.error('Erreur vérification permission native:', error);
        return 'unknown';
      }
    } else if (typeof Notification !== 'undefined') {
      return Notification.permission;
    }
    return 'unknown';
  }
}

// Export d'une instance singleton
export const nativePushService = NativePushService.getInstance();
