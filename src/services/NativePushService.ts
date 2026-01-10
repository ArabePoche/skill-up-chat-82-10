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
 * Seule méthode fiable pour distinguer mobile natif vs web
 */
const getPlatformType = (): 'android' | 'ios' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') {
    return platform;
  }
  return 'web';
};

export class NativePushService {
  private static instance: NativePushService;
  private platformType: 'android' | 'ios' | 'web';

  static getInstance(): NativePushService {
    if (!NativePushService.instance) {
      NativePushService.instance = new NativePushService();
    }
    return NativePushService.instance;
  }

  constructor() {
    this.platformType = getPlatformType();
    console.log('🔧 NativePushService initialisé:', {
      platform: this.platformType,
      isNativeMobile: this.isNativeMobile()
    });
  }

  /**
   * Vérifie si on est sur une plateforme mobile native (Android/iOS)
   */
  private isNativeMobile(): boolean {
    return this.platformType === 'android' || this.platformType === 'ios';
  }

  /**
   * Initialise le service de notifications selon la plateforme
   * IMPORTANT: Sur mobile natif, on n'utilise JAMAIS le code web
   */
  async initialize(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🚀 Initialisation des notifications...', {
        platform: this.platformType
      });

      // Détection stricte: Android ou iOS = push natif uniquement
      if (this.platformType === 'android' || this.platformType === 'ios') {
        return await this.initializeNative();
      }

      // Web uniquement (navigateur réel, pas WebView Capacitor)
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
    if (!PushNotifications) {
      return { success: false, error: 'Capacitor Push Notifications non disponible' };
    }

    try {
      console.log('📱 Initialisation notifications natives Capacitor...');

      // Demander les permissions
      const permissionResult = await PushNotifications.requestPermissions();
      console.log('📋 Résultat permission:', permissionResult);
      
      if (permissionResult.receive === 'granted') {
        // Retourner une promesse qui se résout quand on reçoit le token
        return new Promise((resolve) => {
          // Timeout au cas où le token ne arrive pas
          const timeout = setTimeout(() => {
            console.warn('⏱️ Timeout: pas de token reçu, mais permission accordée');
            resolve({ success: true });
          }, 10000);

          // IMPORTANT: on écoute AVANT d'appeler register(), sinon on peut rater l'événement "registration"
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

          // Enregistrer pour recevoir les notifications (APRÈS les listeners)
          PushNotifications.register().catch((err: any) => {
            clearTimeout(timeout);
            console.error('❌ Erreur register() native:', err);
            resolve({ success: false, error: `Erreur register(): ${JSON.stringify(err)}` });
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
   * IMPORTANT: Cette méthode ne doit JAMAIS être appelée sur mobile natif
   */
  private async initializeWeb(): Promise<{ success: boolean; token?: string; error?: string }> {
    console.log('🌐 Initialisation notifications web (FCM)...');
    
    // Import dynamique de FCMService uniquement sur le web
    // Cela évite que le code Firebase soit évalué sur mobile
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
   * Vérifie si les notifications sont supportées sur cette plateforme
   */
  isSupported(): boolean {
    console.log('🔍 Vérification support notifications:', {
      platform: this.platformType,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    });

    // Sur plateforme native mobile → toujours supporté
    if (this.isNativeMobile()) {
      console.log('✅ Plateforme native mobile détectée, notifications supportées');
      return true;
    }
    
    // Sur le web → vérifier Notification API et Service Worker
    if (typeof window !== 'undefined' && 
        'Notification' in window && 
        'serviceWorker' in navigator) {
      console.log('✅ Web avec Notification API et Service Worker, notifications supportées');
      return true;
    }

    console.warn('⚠️ Notifications non supportées sur cette plateforme');
    return false;
  }

  /**
   * Obtient l'état actuel des permissions
   */
  async getPermissionStatus(): Promise<NotificationPermission | 'unknown'> {
    // Mobile natif: utiliser Capacitor PushNotifications
    if (this.isNativeMobile()) {
      try {
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
