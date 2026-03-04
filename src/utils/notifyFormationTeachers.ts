/**
 * notifyFormationTeachers
 * 
 * Envoie une notification push à tous les professeurs assignés à une formation
 * lorsqu'un élève soumet un exercice ou envoie un message dans le chat.
 * La notification ouvre directement le chat de la formation concernée.
 */
import { supabase } from '@/integrations/supabase/client';

interface NotifyTeachersParams {
  formationId: string;
  senderName: string;
  /** 'message' = message normal, 'exercise' = soumission d'exercice, 'call' = appel entrant */
  type: 'message' | 'exercise' | 'call';
  /** Aperçu du contenu du message (optionnel) */
  contentPreview?: string;
  /** ID de l'expéditeur pour l'exclure s'il est aussi prof */
  senderId: string;
}

export const notifyFormationTeachers = async ({
  formationId,
  senderName,
  type,
  contentPreview,
  senderId,
}: NotifyTeachersParams): Promise<void> => {
  try {
    // 1. Récupérer tous les teacher_id assignés à cette formation
    const { data: teacherFormations, error: tfError } = await supabase
      .from('teacher_formations')
      .select('teacher_id')
      .eq('formation_id', formationId);

    if (tfError || !teacherFormations || teacherFormations.length === 0) {
      console.log('ℹ️ [notifyFormationTeachers] Aucun prof assigné à cette formation');
      return;
    }

    const teacherIds = teacherFormations.map((tf: any) => tf.teacher_id);

    // 2. Récupérer les user_id des profs (excluant l'expéditeur)
    const { data: teachers, error: tError } = await supabase
      .from('teachers')
      .select('user_id')
      .in('id', teacherIds)
      .not('user_id', 'is', null);

    if (tError || !teachers || teachers.length === 0) {
      console.log('ℹ️ [notifyFormationTeachers] Aucun prof trouvé avec user_id');
      return;
    }

    // Exclure l'expéditeur (au cas où il est aussi prof)
    const teacherUserIds = teachers
      .map((t: any) => t.user_id)
      .filter((uid: string) => uid !== senderId);

    if (teacherUserIds.length === 0) {
      console.log('ℹ️ [notifyFormationTeachers] Pas de profs à notifier (expéditeur exclu)');
      return;
    }

    // 3. Récupérer le nom de la formation
    const { data: formation } = await supabase
      .from('formations')
      .select('title')
      .eq('id', formationId)
      .single();

    const formationTitle = formation?.title || 'Formation';

    // 4. Construire le titre et le message
    const title = type === 'exercise'
      ? `📝 Nouvel exercice soumis`
      : type === 'call'
      ? `📞 Appel entrant`
      : `💬 Nouveau message`;

    const message = type === 'exercise'
      ? `${senderName} a soumis un exercice dans "${formationTitle}"`
      : type === 'call'
      ? `${senderName} vous appelle dans "${formationTitle}"`
      : `${senderName} a envoyé un message dans "${formationTitle}"${contentPreview ? `: ${contentPreview.substring(0, 60)}` : ''}`;

    // 5. Envoyer la notification push via l'edge function
    const notifType = type === 'call' ? 'incoming_call' 
      : type === 'exercise' ? 'exercise_validation' 
      : 'teacher_response';

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds: teacherUserIds,
        title,
        message,
        type: notifType,
        data: {
          click_action: `/formation/${formationId}/chat`,
          formationId,
          formationTitle,
        },
      },
    });

    if (error) {
      console.error('❌ [notifyFormationTeachers] Erreur envoi notification:', error);
    } else {
      console.log(`✅ [notifyFormationTeachers] Notification envoyée à ${teacherUserIds.length} prof(s)`);
    }
  } catch (err) {
    // Ne jamais bloquer l'action principale si la notification échoue
    console.error('❌ [notifyFormationTeachers] Exception:', err);
  }
};
