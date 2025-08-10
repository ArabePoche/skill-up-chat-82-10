import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { FCMService } from './FCMService';
import { NotificationService } from './NotificationService';

/**
 * Service unifié pour les notifications push natives (iOS/Android) et web
 * Utilise Capacitor Push pour mobile et Firebase FCM pour web
 */
export class NativePushService {
  private static instance: NativePushService;
  private isNative = false;

  static getInstance(): NativePushService {
    if (!NativePushService.instance) {
      NativePushService.instance = new NativePushService();
    }
    return NativePushService.instance;
  }

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Initialise le service de notifications selon la plateforme
   */
  async initialize(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      if (this.isNative) {
        return await this.initializeNative();
      } else {
        return await this.initializeWeb();
      }
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
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
    try {
      console.log('🔔 Initialisation notifications natives...');

      // Demander les permissions
      const permissionResult = await PushNotifications.requestPermissions();
      
      if (permissionResult.receive === 'granted') {
        // Enregistrer pour recevoir les notifications
        await PushNotifications.register();

        // Écouter les événements
        PushNotifications.addListener('registration', (token) => {
          console.log('📱 Token natif reçu:', token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Erreur enregistrement natif:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📨 Notification native reçue:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('👆 Action notification native:', notification);
        });

        return { success: true };
      } else {
        return { success: false, error: 'Permission refusée' };
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
    console.log('🌐 Initialisation notifications web...');
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
    if (this.isNative) {
      return true; // Capacitor supporte toujours les notifications
    } else {
      return 'Notification' in window && 'serviceWorker' in navigator;
    }
  }

  /**
   * Obtient l'état actuel des permissions
   */
  async getPermissionStatus(): Promise<NotificationPermission | 'unknown'> {
    if (this.isNative) {
      try {
        const result = await PushNotifications.checkPermissions();
        return result.receive === 'granted' ? 'granted' : 'denied';
      } catch {
        return 'unknown';
      }
    } else {
      return Notification.permission;
    }
  }
}

// Export d'une instance singleton
export const nativePushService = NativePushService.getInstance();