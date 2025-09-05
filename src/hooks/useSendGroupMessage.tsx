import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SendGroupMessageParams {
  formationId: string;
  levelId: string;
  content: string;
  messageType?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

export const useSendGroupMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendGroupMessageParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { formationId, levelId, content, messageType = 'text', fileUrl, fileType, fileName } = params;

      // Récupérer une leçon du niveau pour avoir un lesson_id
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('level_id', levelId)
        .limit(1);

      if (!lessons || lessons.length === 0) {
        throw new Error('No lesson found for this level');
      }

      const lessonId = lessons[0].id;

      // Envoyer le message de groupe avec promotion_id = levelId
      const { error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          promotion_id: levelId, // Utiliser levelId comme promotion_id pour les groupes
          is_system_message: false,
          is_exercise_submission: false
        });

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      // Invalider les requêtes de messages de groupe pour ce niveau
      queryClient.invalidateQueries({
        queryKey: ['teacher-group-messages', params.formationId, params.levelId]
      });
    },
  });
};