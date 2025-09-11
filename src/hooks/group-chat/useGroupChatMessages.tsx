
/**
 * Hook pour récupérer les messages en mode groupe avec logique de niveau
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUserProgress, getUsersProgressMap } from '@/utils/progressionUtils';

export interface GroupMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_system_message?: boolean;
  exercise_id?: string;
  exercise_status?: string;
  is_exercise_submission?: boolean;
  replied_to_message_id?: string;
  promotion_id?: string;
  lesson_id?: string;
  formation_id: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
    is_teacher?: boolean;
  };
  replied_to_message?: any;
  // Propriétés pour les vidéos leçons
  video_url?: string;
  lesson_title?: string;
  lesson_status?: string;
  // Type d'élément dans le flux
  item_type: 'message' | 'lesson_video' | 'exercise';
}

export const useGroupChatMessages = (
  levelId: string | undefined,
  formationId: string | undefined,
  promotionId: string | undefined
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-chat-messages', levelId, formationId, promotionId, user?.id],
    queryFn: async (): Promise<GroupMessage[]> => {
      if (!levelId || !formationId || !promotionId || !user?.id) return [];

      console.log('🔍 Fetching group chat messages:', { levelId, formationId, promotionId, userId: user.id });

      // 1. Récupérer la progression actuelle de l'utilisateur
      const currentUserProgress = await getCurrentUserProgress(user.id, formationId);
      console.log('📊 Current user progress:', currentUserProgress);

      // 2. Récupérer toutes les leçons du niveau pour construire les lesson_ids
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('level_id', levelId)
        .order('order_index', { ascending: true });

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return [];
      }

      const lessonIds = lessons?.map(l => l.id) || [];
      console.log('📚 Lessons in level:', lessonIds);

      if (lessonIds.length === 0) return [];

      // 3. Récupérer tous les messages liés aux leçons de ce niveau
      const { data: allMessages, error } = await supabase
        .from('lesson_messages')
        .select(`
          *,
          profiles!sender_id(
            id,
            first_name,
            last_name,
            username,
            avatar_url,
            is_teacher
          ),
          replied_to_message:replied_to_message_id(
            id,
            content,
            sender_id,
            profiles!sender_id(
              id,
              first_name,
              last_name,
              username
            )
          )
        `)
        .eq('formation_id', formationId)
        .in('lesson_id', lessonIds)
        .or(`promotion_id.eq.${promotionId},is_system_message.eq.true,sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching group messages:', error);
        return [];
      }

      // 4. Récupérer uniquement les leçons du currentUser basé sur user_lesson_progress
      const { data: userLessonProgress, error: progressError } = await supabase
        .from('user_lesson_progress')
        .select(`
          lessons!inner(
            id,
            title,
            video_url,
            order_index,
            level_id
          ),
          status,
          exercise_completed,
          create_at
        `)
        .eq('user_id', user.id)
        .eq('level_id', levelId)
        .order('create_at', { ascending: true });

      if (progressError) {
        console.error('Error fetching lesson videos:', progressError);
      }

      // 5. Récupérer les exercices assignés à l'utilisateur depuis lesson_messages
      const { data: userAssignedExercises, error: assignedExercisesError } = await supabase
        .from('lesson_messages')
        .select(`
          *,
          exercises:exercise_id(
            id,
            title,
            description,
            content,
            type
          )
        `)
        .eq('receiver_id', user.id)
        .eq('formation_id', formationId)
        .eq('is_system_message', true)
        .not('exercise_id', 'is', null)
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: true });

      if (assignedExercisesError) {
        console.error('Error fetching user assigned exercises:', assignedExercisesError);
      }

      // 6. Récupérer les soumissions d'exercices du currentUser depuis lesson_messages
      const { data: userExercises, error: exercisesError } = await supabase
        .from('lesson_messages')
        .select(`
          *,
          exercises:exercise_id(
            id,
            title,
            description
          )
        `)
        .eq('sender_id', user.id)
        .eq('formation_id', formationId)
        .eq('is_exercise_submission', true)
        .not('exercise_id', 'is', null)
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: true });

      if (exercisesError) {
        console.error('Error fetching user exercises:', exercisesError);
      }

      // 7. Récupérer les progressions des utilisateurs qui ont envoyé des messages
      const senderIds = [...new Set(
        (allMessages || [])
          .map(m => m.sender_id)
          .filter(Boolean)
          .filter(id => id !== user.id)
      )] as string[];

      const userProgressMap = senderIds.length > 0 ? await getUsersProgressMap(senderIds) : new Map();

      // 8. Filtrer les messages selon les règles de groupe
      const filteredMessages = (allMessages || []).filter(message => {
        // Messages système : toujours visibles
        if (message.is_system_message) return true;
        
        // Ses propres messages : toujours visibles
        if (message.sender_id === user.id) return true;
        
        // Messages qui lui sont adressés : toujours visibles
        if (message.receiver_id === user.id) return true;
        
        // Messages dans lesquels on lui fait un reply : toujours visibles
        if (message.replied_to_message_id) {
          const replyTarget = allMessages?.find(m => m.id === message.replied_to_message_id);
          if (replyTarget?.sender_id === user.id) return true;
        }
        
        // Messages des professeurs : toujours visibles pour les élèves
        if (message.profiles?.is_teacher) return true;
        
        // Messages des autres élèves de la même promotion
        if (message.promotion_id === promotionId && message.sender_id !== user.id) {
          const senderProgress = userProgressMap.get(message.sender_id);
          
          if (!senderProgress) return true;
          
          return senderProgress.levelOrder < currentUserProgress.levelOrder || 
                 (senderProgress.levelOrder === currentUserProgress.levelOrder && 
                  senderProgress.lessonOrder <= currentUserProgress.lessonOrder);
        }
        
        return false;
      });

      // 9. Combiner tous les éléments en un seul flux
      const combinedItems: GroupMessage[] = [];

      // Ajouter les messages filtrés
      filteredMessages.forEach(message => {
        combinedItems.push({
          ...message,
          item_type: 'message' as const,
          formation_id: formationId
        });
      });

      // Ajouter les vidéos leçons uniquement pour l'utilisateur actuel
      if (userLessonProgress && !progressError) {
        console.log('📺 User lesson progress data:', userLessonProgress);
        userLessonProgress.forEach((progress) => {
          const lesson = progress.lessons;
          console.log('🎬 Processing lesson:', lesson);
          if (lesson?.video_url) {
            // Utiliser le timestamp create_at de user_lesson_progress pour un tri correct
            const lessonTimestamp = progress.create_at || new Date().toISOString();
            console.log('✅ Adding lesson video:', {
              lessonId: lesson.id,
              title: lesson.title,
              videoUrl: lesson.video_url,
              timestamp: lessonTimestamp
            });
            
            combinedItems.push({
              id: `lesson_video_${lesson.id}`,
              content: `📹 Vidéo: ${lesson.title}`,
              sender_id: 'system',
              created_at: lessonTimestamp,
              message_type: 'lesson_video',
              formation_id: formationId,
              lesson_id: lesson.id,
              video_url: lesson.video_url,
              lesson_title: lesson.title,
              lesson_status: progress.status || 'available',
              item_type: 'lesson_video' as const,
              is_system_message: true
            });
          } else {
            console.log('❌ No video URL for lesson:', lesson);
          }
        });
      }

      // Ajouter les exercices assignés à l'utilisateur
      (userAssignedExercises || []).forEach(exercise => {
        if (exercise.exercises) {
          combinedItems.push({
            ...exercise,
            item_type: 'exercise' as const,
            formation_id: formationId,
            content: exercise.exercises.title || exercise.content,
            exercise_id: exercise.exercise_id
          });
        }
      });

      // Ajouter les exercices du currentUser (soumissions) - comme des messages normaux
      (userExercises || []).forEach(exercise => {
        combinedItems.push({
          ...exercise,
          item_type: 'message' as const,
          formation_id: formationId
          // On conserve le content et file_* originaux de la soumission
        });
      });

      // 10. Déduplication par ID pour éviter les doublons
      const uniqueItemsMap = new Map<string, GroupMessage>();
      combinedItems.forEach(item => {
        uniqueItemsMap.set(item.id, item);
      });
      
      // 11. Trier par date de création
      const sortedItems = Array.from(uniqueItemsMap.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      console.log(`\n📊 Final combined result:`, {
        messages: filteredMessages.length,
        lessonVideos: (userLessonProgress || []).length,
        assignedExercises: (userAssignedExercises || []).length,
        userExercises: (userExercises || []).length,
        totalItems: sortedItems.length
      });

      return sortedItems;
    },
    enabled: !!levelId && !!formationId && !!promotionId && !!user?.id,
    refetchInterval: false,
  });
};
