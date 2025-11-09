/**
 * Service de gestion des sons de notification selon le type
 */

export type NotificationSoundType = 'friend' | 'order' | 'enrollment' | 'default';

const soundMap: Record<NotificationSoundType, string> = {
  friend: '/sounds/notification-friend.mp3',
  order: '/sounds/notification-order.mp3',
  enrollment: '/sounds/notification-enrollment.mp3',
  default: '/sounds/notification-default.mp3',
};

class NotificationSoundServiceClass {
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  /**
   * Précharge tous les sons de notification
   */
  preloadSounds() {
    Object.entries(soundMap).forEach(([type, path]) => {
      if (!this.audioCache.has(type)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        this.audioCache.set(type, audio);
      }
    });
  }

  /**
   * Joue un son de notification selon le type
   */
  async playNotificationSound(type: NotificationSoundType = 'default') {
    try {
      let audio = this.audioCache.get(type);
      
      if (!audio) {
        audio = new Audio(soundMap[type]);
        this.audioCache.set(type, audio);
      }

      // Reset audio si déjà en cours
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.warn('Impossible de jouer le son de notification:', error);
    }
  }

  /**
   * Obtient le type de son selon le type de notification
   */
  getSoundTypeFromNotification(notificationType: string): NotificationSoundType {
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
