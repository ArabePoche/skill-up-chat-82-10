import { supabase } from '@/integrations/supabase/client';
import { NotificationSoundService } from '@/services/NotificationSoundService';

// Types pour les notifications
export type NotificationType = 'daily_reminder' | 'teacher_response' | 'exercise_validation' | 'new_lesson' | 'test';

export interface SendNotificationParams {
  userIds?: string[];
  title: string;
  message?: string;
  type: NotificationType;
  clickAction?: string;
  data?: Record<string, any>;
}

// Fonction helper pour envoyer des notifications
export const sendPushNotification = async (params: SendNotificationParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: params
    });

    if (error) {
      console.error('Erreur lors de l\'envoi de notification:', error);
      throw error;
    }

    // Jouer le son approprié selon le type de notification
    const soundType = NotificationSoundService.getSoundTypeFromNotification(params.type);
    await NotificationSoundService.playNotificationSound(soundType);

    console.log('Notification envoyée avec succès:', data);
    return data;
  } catch (error) {
    console.error('Erreur dans sendPushNotification:', error);
    throw error;
  }
};

// Notifications déclenchées par les actions utilisateur
export const NotificationTriggers = {
  // Quand un exercice est validé
  onExerciseValidated: async (studentId: string, exerciseTitle: string) => {
    await sendPushNotification({
      userIds: [studentId],
      title: "🎉 Exercice validé !",
      type: "exercise_validation",
      clickAction: "/cours",
      data: { exerciseTitle }
    });
  },

  // Quand un prof répond à un étudiant
  onTeacherResponse: async (studentId: string, teacherName: string, lessonTitle: string) => {
    await sendPushNotification({
      userIds: [studentId],
      title: "💬 Réponse de votre professeur",
      message: `${teacherName} a répondu dans "${lessonTitle}"`,
      type: "teacher_response",
      clickAction: "/messages",
      data: { teacherName, lessonTitle }
    });
  },

  // Quand une nouvelle leçon est débloquée
  onNewLessonUnlocked: async (studentId: string, lessonTitle: string) => {
    await sendPushNotification({
      userIds: [studentId],
      title: "🆕 Nouvelle leçon débloquée !",
      message: `"${lessonTitle}" est maintenant disponible`,
      type: "new_lesson",
      clickAction: "/cours",
      data: { lessonTitle }
    });
  },

  // Rappel quotidien (à utiliser avec un cron job)
  sendDailyReminders: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-reminders');
      
      if (error) {
        console.error('Erreur lors de l\'envoi des rappels quotidiens:', error);
        throw error;
      }

      console.log('Rappels quotidiens envoyés:', data);
      return data;
    } catch (error) {
      console.error('Erreur dans sendDailyReminders:', error);
      throw error;
    }
  },

  // Quand quelqu'un like une vidéo
  onVideoLiked: async (videoId: string, likerUserId: string, likerName: string) => {
    const { data: video } = await supabase
      .from('videos')
      .select('author_id, title')
      .eq('id', videoId)
      .single();

    if (video && video.author_id !== likerUserId) {
      await sendPushNotification({
        userIds: [video.author_id],
        title: "❤️ Nouveau like !",
        message: `${likerName} a aimé votre vidéo${video.title ? ` "${video.title}"` : ''}`,
        type: "test",
        clickAction: `/video/${videoId}`,
        data: { videoId, likerUserId }
      });
    }
  },

  // Quand quelqu'un commente une vidéo
  onVideoCommented: async (videoId: string, commenterUserId: string, commenterName: string) => {
    const { data: video } = await supabase
      .from('videos')
      .select('author_id, title')
      .eq('id', videoId)
      .single();

    if (video && video.author_id !== commenterUserId) {
      await sendPushNotification({
        userIds: [video.author_id],
        title: "💬 Nouveau commentaire !",
        message: `${commenterName} a commenté votre vidéo${video.title ? ` "${video.title}"` : ''}`,
        type: "test",
        clickAction: `/video/${videoId}`,
        data: { videoId, commenterUserId }
      });
    }
  },

  // Quand quelqu'un like un post
  onPostLiked: async (postId: string, likerUserId: string, likerName: string) => {
    const { data: post } = await supabase
      .from('posts')
      .select('author_id, content')
      .eq('id', postId)
      .single();

    if (post && post.author_id !== likerUserId) {
      const preview = post.content?.substring(0, 50) || '';
      await sendPushNotification({
        userIds: [post.author_id],
        title: "❤️ Nouveau like !",
        message: `${likerName} a aimé votre post${preview ? ` "${preview}..."` : ''}`,
        type: "test",
        clickAction: `/post/${postId}`,
        data: { postId, likerUserId }
      });
    }
  }
};

// Fonction pour tester les notifications
export const testNotification = async (userId: string) => {
  return await sendPushNotification({
    userIds: [userId],
    title: "🎯 Test de notification",
    message: "Super ! Vos notifications fonctionnent parfaitement. Prêt à apprendre ?",
    type: "test",
    clickAction: "/",
    data: { isTest: true }
  });
};