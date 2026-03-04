/**
 * Service de gestion des sons de notification selon le type
 * Compatible avec tous les navigateurs (fallback si format non supporté)
 */
import { Capacitor } from '@capacitor/core';

export type NotificationSoundType = 'friend' | 'order' | 'enrollment' | 'call' | 'default';

const soundMap: Record<NotificationSoundType, string> = {
  friend: '/sounds/notification-friend.mp3',
  order: '/sounds/notification-order.mp3',
  enrollment: '/sounds/notification-enrollment.mp3',
  call: '/sounds/ringtone-call.mp3',
  default: '/sounds/notification-default.mp3',
};

class NotificationSoundServiceClass {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isNativeMobile: boolean;

  constructor() {
    const platform = Capacitor.getPlatform();
    this.isNativeMobile = platform === 'android' || platform === 'ios';
  }

  /**
   * Précharge tous les sons de notification
   * Sur mobile natif, on ne précharge pas (les sons sont gérés nativement)
   */
  preloadSounds() {
    // Sur mobile natif, ne pas précharger les sons web
    if (this.isNativeMobile) {
      console.log('📱 Mobile natif: sons gérés par le système');
      return;
    }

    // Vérifier si l'API Audio est disponible
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      console.warn('⚠️ API Audio non disponible');
      return;
    }

    Object.entries(soundMap).forEach(([type, path]) => {
      if (!this.audioCache.has(type)) {
        try {
          const audio = new Audio();

          // Configurer l'audio avant de charger
          audio.preload = 'auto';
          audio.volume = 0.5;

          // Gérer les erreurs de chargement silencieusement
          audio.onerror = () => {
            console.warn(`⚠️ Impossible de charger le son: ${path}`);
            this.audioCache.delete(type);
          };

          audio.src = path;
          this.audioCache.set(type, audio);
        } catch (e) {
          console.warn(`⚠️ Erreur création audio pour ${type}:`, e);
        }
      }
    });
  }

  /**
   * Joue un son de notification selon le type
   * Gère les erreurs silencieusement (ne bloque pas l'UX)
   */
  async playNotificationSound(type: NotificationSoundType = 'default'): Promise<void> {
    // Sur mobile natif, le son est géré par le système
    if (this.isNativeMobile) {
      console.log('📱 Mobile natif: son notification système');
      return;
    }

    // Vérifier si l'API Audio est disponible
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      console.warn('⚠️ API Audio non disponible');
      return;
    }

    try {
      let audio = this.audioCache.get(type);

      if (!audio) {
        // Créer l'audio à la volée si pas en cache
        audio = new Audio(soundMap[type]);
        audio.volume = 0.5;
        this.audioCache.set(type, audio);
      }

      // Reset audio si déjà en cours
      audio.currentTime = 0;

      // Jouer avec gestion d'erreur
      await audio.play();
    } catch (error) {
      // Erreurs courantes: NotAllowedError (autoplay bloqué), NotSupportedError (format)
      // On les ignore silencieusement pour ne pas perturber l'UX
      console.log('ℹ️ Son notification non joué:',
        error instanceof Error ? error.name : 'Erreur inconnue'
      );
    }
  }

  /**
   * Obtient le type de son selon le type de notification
   */
  getSoundTypeFromNotification(notificationType: string): NotificationSoundType {
    if (notificationType.includes('call') || notificationType.includes('incoming_call')) {
      return 'call';
    }
    if (notificationType.includes('friend') || notificationType.includes('contact')) {
      return 'friend';
    }
    if (notificationType.includes('order') || notificationType.includes('purchase')) {
      return 'order';
    }
    if (notificationType.includes('enrollment') || notificationType.includes('inscription')) {
      return 'enrollment';
    }
    return 'default';
  }
}

export const NotificationSoundService = new NotificationSoundServiceClass();
