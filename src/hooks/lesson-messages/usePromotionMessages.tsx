
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUserProgress, getUsersProgressMap } from '@/utils/progressionUtils';
import { localMessageStore } from '@/message-cache/utils/localMessageStore';
import { useState, useEffect } from 'react';

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
  level_id?: string;
  validated_by_teacher_id?: string;
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

const MESSAGES_PER_PAGE = 30;

/**
 * Hook pour récupérer les messages de promotion avec filtrage par niveau
 * Supporte deux modes : par leçon spécifique ou par niveau complet
 * Optimisé avec pagination inversée pour charger les messages récents d'abord
 */
export const usePromotionMessages = (
  lessonIdOrLevelId: string | undefined, 
  formationId: string | undefined, 
  promotionId: string,
  mode: 'lesson' | 'level' = 'lesson'
) => {
  const { user } = useAuth();
  const [cachedMessages, setCachedMessages] = useState<GroupMessage[] | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Charger depuis le cache au montage
  useEffect(() => {
    if (!lessonIdOrLevelId || !formationId || !user?.id) {
      setIsLoadingCache(false);
      return;
    }

    const loadCache = async () => {
      const cacheKey = mode === 'level' 
        ? `level_${lessonIdOrLevelId}` 
        : lessonIdOrLevelId;
      const cached = await localMessageStore.getMessages(cacheKey, formationId, `${user.id}_${promotionId}`);
      setCachedMessages(cached as GroupMessage[] | null);
      setIsLoadingCache(false);
    };

    loadCache();
  }, [lessonIdOrLevelId, formationId, user?.id, promotionId, mode]);

  return useQuery({
    queryKey: ['promotion-messages', lessonIdOrLevelId, formationId, user?.id, promotionId, mode],
    queryFn: async (): Promise<GroupMessage[]> => {
      if (!lessonIdOrLevelId || !formationId || !user?.id || !promotionId) return [];

      console.log('🔍 Fetching promotion messages (optimized):', { 
        lessonIdOrLevelId, 
        formationId, 
        userId: user.id, 
        promotionId, 
        mode 
      });

      // 1. Récupérer la dernière leçon atteinte par l'utilisateur (en arrière-plan)
      const userProgressPromise = supabase
        .from('user_lesson_progress')
        .select(`
          lesson_id,
          lessons!inner (
            id,
            order_index,
            levels!inner (
              order_index,
              formation_id
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('lessons.levels.formation_id', formationId);

      const { data: userProgressData, error: progressError } = await userProgressPromise;

      if (progressError) {
        console.error('❌ Error fetching user progress:', progressError);
      }

      // Déterminer la dernière leçon atteinte (ordre le plus élevé)
      let maxReachedLessonOrder = -1;
      let maxReachedLevelOrder = -1;
      let userReachedLessonIds = new Set<string>();

      if (userProgressData && userProgressData.length > 0) {
        userProgressData.forEach(progress => {
          userReachedLessonIds.add(progress.lesson_id);
          const levelOrder = progress.lessons.levels.order_index;
          const lessonOrder = progress.lessons.order_index;
          
          if (levelOrder > maxReachedLevelOrder || 
              (levelOrder === maxReachedLevelOrder && lessonOrder > maxReachedLessonOrder)) {
            maxReachedLevelOrder = levelOrder;
            maxReachedLessonOrder = lessonOrder;
          }
        });
      }

      // Récupérer toutes les leçons de la formation avec leurs ordres pour le filtrage
      const allLessonsPromise = supabase
        .from('lessons')
        .select(`
          id,
          order_index,
          levels!inner (
            order_index,
            formation_id
          )
        `)
        .eq('levels.formation_id', formationId);

      const { data: allLessonsData, error: allLessonsError } = await allLessonsPromise;

      if (allLessonsError) {
        console.error('❌ Error fetching lessons:', allLessonsError);
      }

      // Créer une map des leçons avec leurs ordres
      const lessonOrderMap = new Map<string, {levelOrder: number, lessonOrder: number}>();
      allLessonsData?.forEach(lesson => {
        lessonOrderMap.set(lesson.id, {
          levelOrder: lesson.levels.order_index,
          lessonOrder: lesson.order_index
        });
      });

      let lessonIds: string[] = [];

      if (mode === 'level') {
        // Mode niveau : récupérer toutes les leçons du niveau
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id')
          .eq('level_id', lessonIdOrLevelId)
          .order('order_index', { ascending: true });

        if (lessonsError) {
          console.error('Error fetching lessons:', lessonsError);
          return [];
        }

        lessonIds = lessons?.map(l => l.id) || [];
      } else {
        // Mode leçon : utiliser directement l'ID fourni
        lessonIds = [lessonIdOrLevelId];
      }

      if (lessonIds.length === 0) return [];

      // 2. Récupérer les messages avec pagination inversée (du plus récent au plus ancien)
      let messagesQuery = supabase
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
        .or(`promotion_id.eq.${promotionId},is_system_message.eq.true,sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE * 2); // Charger 60 messages initialement

      if (mode === 'level') {
        messagesQuery.in('lesson_id', lessonIds);
      } else {
        messagesQuery.eq('lesson_id', lessonIdOrLevelId);
      }

      const { data: paginatedMessages, error: paginationError } = await messagesQuery;

      if (paginationError) {
        console.error('❌ Error fetching paginated messages:', paginationError);
        return [];
      }

      const messages = paginatedMessages || [];

      // 3. Récupérer les leçons avec vidéos pour l'utilisateur actuel (mode niveau uniquement) - en arrière-plan
      let userLessonProgress: any[] = [];
      if (mode === 'level') {
        // Ne pas bloquer le chargement initial pour cette donnée
        const lessonProgressPromise = supabase
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
          .eq('level_id', lessonIdOrLevelId)
          .order('create_at', { ascending: false }) // Du plus récent au plus ancien
          .limit(20); // Limiter pour la performance

        const { data: progressData } = await lessonProgressPromise;
        if (progressData) {
          userLessonProgress = progressData;
        }
      }

      // 4. Récupérer les exercices assignés (mode niveau uniquement) - en arrière-plan
      let userAssignedExercises: any[] = [];
      if (mode === 'level') {
        const exercisesPromise = supabase
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
          .order('created_at', { ascending: false }) // Du plus récent au plus ancien
          .limit(20); // Limiter pour la performance

        const { data: exercisesData } = await exercisesPromise;
        if (exercisesData) {
          userAssignedExercises = exercisesData;
        }
      }

      // 5. Récupérer les soumissions d'exercices de l'utilisateur (mode niveau uniquement) - en arrière-plan
      let userExercises: any[] = [];
      if (mode === 'level') {
        const submissionsPromise = supabase
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
          .order('created_at', { ascending: false }) // Du plus récent au plus ancien
          .limit(20); // Limiter pour la performance

        const { data: submissionsData } = await submissionsPromise;
        if (submissionsData) {
          userExercises = submissionsData;
        }
      }

      // 6. Récupérer les progressions des utilisateurs qui ont envoyé des messages - en arrière-plan
      const senderIds = [...new Set(
        messages
          .map(m => m.sender_id)
          .filter(Boolean)
          .filter(id => id !== user.id)
      )] as string[];

      // Limiter le nombre de progressions à charger en arrière-plan
      const limitedSenderIds = senderIds.slice(0, 50);
      const userProgressMap = limitedSenderIds.length > 0 ? await getUsersProgressMap(limitedSenderIds) : new Map();

      // 7. Filtrer les messages selon les règles de promotion
      const filteredMessages = messages.filter(message => {
        // Messages système : toujours visibles
        if (message.is_system_message) return true;
        
        // Ses propres messages : toujours visibles
        if (message.sender_id === user.id) return true;
        
        // Messages qui lui sont adressés : toujours visibles
        if (message.receiver_id === user.id) return true;
        
        // Messages dans lesquels on lui fait un reply : toujours visibles
        if (message.replied_to_message_id) {
          const replyTarget = messages?.find(m => m.id === message.replied_to_message_id);
          if (replyTarget?.sender_id === user.id) return true;
        }
        
        // Messages des professeurs : toujours visibles pour les élèves
        if (message.profiles?.is_teacher) return true;
        
        // Messages des autres élèves de la même promotion - FILTRAGE STRICT PAR LESSON_ID
        if (message.promotion_id === promotionId && message.sender_id !== user.id) {
          // Si l'utilisateur n'a atteint aucune leçon, ne pas montrer les messages des camarades
          if (userReachedLessonIds.size === 0) {
            return false;
          }
          
          // Vérifier si le message provient d'une leçon que l'utilisateur a atteinte
          if (!message.lesson_id) return false;
          
          // Récupérer l'ordre de la leçon du message depuis la map
          const messageLessonOrder = lessonOrderMap.get(message.lesson_id);
          if (!messageLessonOrder) return false;
          
          // L'utilisateur peut voir les messages des leçons qu'il a atteintes ou dépassées
          return messageLessonOrder.levelOrder < maxReachedLevelOrder || 
                 (messageLessonOrder.levelOrder === maxReachedLevelOrder && 
                  messageLessonOrder.lessonOrder <= maxReachedLessonOrder);
        }
        
        return false;
      });

      // 8. Combiner tous les éléments en un seul flux (mode niveau uniquement)
      const combinedItems: GroupMessage[] = [];

      // Ajouter les messages filtrés
      filteredMessages.forEach(message => {
        combinedItems.push({
          ...message,
          item_type: 'message' as const,
          formation_id: formationId
        });
      });

      if (mode === 'level') {
        // Ajouter les vidéos leçons uniquement pour l'utilisateur actuel
        userLessonProgress.forEach((progress) => {
          const lesson = progress.lessons;
          if (lesson?.video_url) {
            const lessonTimestamp = progress.create_at || new Date().toISOString();
            
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
          }
        });

        // Ajouter les exercices assignés à l'utilisateur
        userAssignedExercises.forEach(exercise => {
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
        userExercises.forEach(exercise => {
          combinedItems.push({
            ...exercise,
            item_type: 'message' as const,
            formation_id: formationId
          });
        });
      }

      // 9. Déduplication par ID pour éviter les doublons
      const uniqueItemsMap = new Map<string, GroupMessage>();
      combinedItems.forEach(item => {
        uniqueItemsMap.set(item.id, item);
      });
      
      // 10. Trier par date de création (ordre chronologique)
      const sortedItems = Array.from(uniqueItemsMap.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      console.log(`📊 Optimized result:`, {
        messages: filteredMessages.length,
        lessonVideos: userLessonProgress.length,
        assignedExercises: userAssignedExercises.length,
        userExercises: userExercises.length,
        totalItems: sortedItems.length,
        mode,
        pagination: 'inverted'
      });

      // Sauvegarder dans le cache
      const cacheKey = mode === 'level' 
        ? `level_${lessonIdOrLevelId}` 
        : lessonIdOrLevelId;
      await localMessageStore.saveMessages(cacheKey, formationId, `${user.id}_${promotionId}`, sortedItems);

      return sortedItems;
    },
    enabled: !!lessonIdOrLevelId && !!formationId && !!user?.id && !!promotionId,
    initialData: cachedMessages || undefined,
    refetchInterval: 10000, // Augmenté pour réduire les requêtes
    staleTime: 30000, // Augmenté pour utiliser le cache plus longtemps
    gcTime: 300000, // 5 minutes de cache
  });
};

/**
 * Hook pour le chargement infini des messages (infinite scroll)
 * À utiliser pour charger les anciens messages au scroll
 */
export const usePromotionMessagesInfinite = (
  lessonIdOrLevelId: string | undefined, 
  formationId: string | undefined, 
  promotionId: string,
  mode: 'lesson' | 'level' = 'lesson'
) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['promotion-messages-infinite', lessonIdOrLevelId, formationId, user?.id, promotionId, mode],
    queryFn: async ({ pageParam = 0 }) => {
      if (!lessonIdOrLevelId || !formationId || !user?.id || !promotionId) return { data: [], hasMore: false };

      const offset = pageParam * MESSAGES_PER_PAGE;

      // Récupérer les messages avec pagination
      let messagesQuery = supabase
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
          )
        `)
        .eq('formation_id', formationId)
        .or(`promotion_id.eq.${promotionId},is_system_message.eq.true,sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1);

      if (mode === 'level') {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('level_id', lessonIdOrLevelId);
        const lessonIds = lessons?.map(l => l.id) || [];
        messagesQuery.in('lesson_id', lessonIds);
      } else {
        messagesQuery.eq('lesson_id', lessonIdOrLevelId);
      }

      const { data, error } = await messagesQuery;

      if (error) {
        console.error('Error fetching paginated messages:', error);
        return { data: [], hasMore: false };
      }

      return {
        data: data || [],
        hasMore: (data?.length || 0) >= MESSAGES_PER_PAGE
      };
    },
    enabled: !!lessonIdOrLevelId && !!formationId && !!user?.id && !!promotionId,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length;
    },
    staleTime: 30000,
    gcTime: 300000,
  });
};
