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

  /**
   * Gestion interne des tokens natifs.
   * Objectif: même si `initializeNative()` timeout, on veut capter le token
   * plus tard (event `registration`) et le remonter au front via listeners.
   */
  private nativeListenersReady = false;
  private lastNativeToken: string | null = null;
  private tokenListeners = new Set<(token: string) => void>();

  static getInstance(): NativePushService {
    if (!NativePushService.instance) {
      NativePushService.instance = new NativePushService();
    }
    return NativePushService.instance;
  }

  private isInitializing = false;

  constructor() {
    console.log('🔧 NativePushService créé');
    // On n'appelle plus initEarly() dans le constructeur pour éviter les crashes
    // L'initialisation se fera à la demande via initialize() ou initEarlyWhenReady()
  }

  /**
   * Initialisation différée - appelée uniquement quand l'app est montée
   * et Capacitor est prêt. Évite les crashes au démarrage sur Android.
   */
  async initEarlyWhenReady(): Promise<void> {
    const platform = this.getPlatformType(true);
    console.log('🚀 [NativePushService] initEarlyWhenReady - platform:', platform);

    if (platform !== 'android' && platform !== 'ios') return;

    try {
      console.log('📱 [NativePushService] Mobile natif détecté, setup listeners...');
      this.ensureNativeListeners();

      // Vérifier si on a déjà la permission et récupérer le token
      if (!isPushNotificationsAvailable()) {
        console.log('⚠️ [NativePushService] Plugin push non disponible');
        return;
      }

      const result = await PushNotifications.checkPermissions();
      console.log('🔐 [NativePushService] Permission existante:', result.receive);

      if (result.receive === 'granted') {
        console.log('✅ [NativePushService] Permission déjà accordée, registration...');
        await PushNotifications.register();
        console.log('📤 [NativePushService] register() appelé au démarrage');
      }
    } catch (error) {
      console.error('❌ [NativePushService] Erreur initEarlyWhenReady:', error);
    }
  }

  /**
   * S'abonner aux mises à jour de token (principalement utile sur mobile natif).
   * Retourne une fonction `unsubscribe`.
   */
  onToken(listener: (token: string) => void): () => void {
    this.tokenListeners.add(listener);
    // Si on a déjà un token, on le rejoue pour synchroniser l'état.
    if (this.lastNativeToken) {
      listener(this.lastNativeToken);
    }
    return () => {
      this.tokenListeners.delete(listener);
    };
  }

  private emitToken(token: string) {
    this.lastNativeToken = token;
    for (const cb of this.tokenListeners) {
      try {
        cb(token);
      } catch (e) {
        console.warn('⚠️ Erreur listener token push:', e);
      }
    }
  }

  /**
   * Enregistre les listeners natifs une seule fois pour éviter les doublons.
   */
  private ensureNativeListeners(): void {
    if (this.nativeListenersReady) {
      console.log('⏭️ [NativePushService] Listeners déjà configurés');
      return;
    }

    if (!isPushNotificationsAvailable()) {
      console.error('❌ [NativePushService] Plugin PushNotifications NON disponible!');
      return;
    }

    this.nativeListenersReady = true;
    console.log('🔧 [NativePushService] Configuration des listeners natifs...');

    PushNotifications.addListener('registration', (token: { value: string }) => {
      console.log('🎯 [NativePushService] EVENT registration reçu!');
      console.log('🎯 [NativePushService] Token FCM:', token.value?.substring(0, 30) + '...');
      console.log('🎯 [NativePushService] Token length:', token.value?.length);

      if (token?.value) {
        this.emitToken(token.value);
      } else {
        console.error('❌ [NativePushService] Token vide reçu!');
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ [NativePushService] EVENT registrationError:', JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('📨 [NativePushService] Notification foreground:', JSON.stringify(notification));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      console.log('👆 [NativePushService] Action notification:', JSON.stringify(notification));
    });

    console.log('✅ [NativePushService] Listeners natifs configurés!');
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
    const platform = this.getPlatformType();


    if (platform === 'android' || platform === 'ios') {
      return isPushNotificationsAvailable();
    }

    if (typeof window !== 'undefined') {
      return 'Notification' in window && 'serviceWorker' in navigator;
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
      const platform = this.getPlatformType();

      console.log('🚀 [NativePushService] initialize() platform:', platform);

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
    if (this.isInitializing) {
      console.log('⏳ [NativePushService] Initialisation déjà en cours, skip');
      return { success: true };
    }
    this.isInitializing = true;

    if (!isPushNotificationsAvailable()) {
      this.isInitializing = false;
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

      // Préparer les listeners natifs (persistants) avant l'enregistrement.
      this.ensureNativeListeners();

      // Enregistrer auprès de FCM/APNS (le token arrivera via l'event `registration`).
      // Enregistrer auprès de FCM/APNS (le token arrivera via l'event `registration`).
      PushNotifications.register().catch((err: any) => {
        console.error('❌ [NativePushService] CRITICAL Error register() native:', err);
        console.error('👉 Vérifiez que google-services.json est présent dans android/app/');
        console.error('👉 Vérifiez que le package name correspond à Firebase Console');
      });

      // Attendre (au max 15s) un token; s'il arrive plus tard, on le captera quand même
      // via `ensureNativeListeners()` + `onToken()`.
      const token = await new Promise<string | null>((resolve) => {
        let done = false;
        const unsub = this.onToken((t) => {
          if (done) return;
          done = true;
          unsub();
          resolve(t);
        });

        setTimeout(() => {
          if (done) return;
          done = true;
          unsub();
          console.warn('⏱️ Timeout: pas de token reçu (il peut arriver plus tard)');
          resolve(null);
        }, 15000);
      });

      this.isInitializing = false;
      return token ? { success: true, token } : { success: true };
    } catch (error) {
      this.isInitializing = false;
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
