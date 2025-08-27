
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook pour insérer automatiquement les vidéos de leçons dans lesson_messages
 * au nom de l'élève pour son propre niveau
 */
export const useLessonVideoInsertion = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      formationId,
      promotionId,
      lessonTitle,
      videoUrl
    }: {
      lessonId: string;
      formationId: string;
      promotionId?: string;
      lessonTitle: string;
      videoUrl?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('Inserting lesson video message:', { 
        lessonId, 
        formationId, 
        lessonTitle,
        userId: user.id 
      });

      // Vérifier si la vidéo a déjà été insérée pour cet utilisateur
      const { data: existingMessage } = await supabase
        .from('lesson_messages')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('formation_id', formationId)
        .eq('sender_id', user.id)
        .eq('message_type', 'lesson_video')
        .eq('is_system_message', true)
        .single();

      if (existingMessage) {
        console.log('Lesson video already inserted for this user');
        return {
          id: existingMessage.id,
          lesson_id: lessonId,
          formation_id: formationId,
          promotion_id: promotionId
        };
      }

      // Insérer le message de vidéo de leçon au nom de l'utilisateur
      const content = videoUrl 
        ? `📹 Vidéo de la leçon : ${lessonTitle}`
        : `📚 Leçon : ${lessonTitle}`;

      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          promotion_id: promotionId || null,
          sender_id: user.id, // Au nom de l'élève lui-même
          receiver_id: user.id, // Pour lui-même
          content,
          message_type: 'lesson_video',
          is_system_message: true,
          file_url: videoUrl || null,
          file_type: videoUrl ? 'video' : null
        })
        .select('id, lesson_id, formation_id, promotion_id')
        .single();

      if (error) {
        console.error('Error inserting lesson video message:', error);
        throw error;
      }

      console.log('Lesson video message inserted:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalider les queries de messages pour rafraîchir l'affichage
      queryClient.invalidateQueries({ 
        queryKey: ['lesson-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['promotion-messages', data.lesson_id, data.formation_id] 
      });
    },
  });
};
