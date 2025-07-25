import { supabase } from '@/integrations/supabase/client';

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