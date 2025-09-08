
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface pour la progression d'un utilisateur
 */
export interface UserProgressionInfo {
  userId: string;
  levelOrder: number;
  lessonOrder: number;
  formationId: string;
}

/**
 * Récupère la progression actuelle d'un utilisateur dans une formation
 */
export const getCurrentUserProgress = async (userId: string, formationId: string): Promise<UserProgressionInfo> => {
  console.log('Getting current user progress for:', { userId, formationId });

  // Récupérer la progression maximale de l'utilisateur
  const { data: progressData, error } = await supabase
    .from('user_lesson_progress')
    .select(`
      lesson_id,
      status,
      lessons!inner (
        id,
        order_index,
        levels!inner (
          id,
          order_index,
          formation_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('lessons.levels.formation_id', formationId)
    .in('status', ['not_started', 'in_progress', 'awaiting_review', 'completed'])
    .order('lessons!inner.levels!inner.order_index', { ascending: false })
    .order('lessons!inner.order_index', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching user progress:', error);
    // Retourner niveau 0 par défaut en cas d'erreur
    return {
      userId,
      levelOrder: 0,
      lessonOrder: 0,
      formationId
    };
  }

  if (!progressData || progressData.length === 0) {
    // Pas de progression, niveau 0
    return {
      userId,
      levelOrder: 0,
      lessonOrder: 0,
      formationId
    };
  }

  const currentProgress = progressData[0];
  
  return {
    userId,
    levelOrder: currentProgress.lessons.levels.order_index,
    lessonOrder: currentProgress.lessons.order_index,
    formationId
  };
};

/**
 * Récupère les progressions de plusieurs utilisateurs
 */
export const getUsersProgressMap = async (userIds: string[]): Promise<Map<string, UserProgressionInfo>> => {
  if (userIds.length === 0) return new Map();

  console.log('Getting progress for multiple users:', userIds);

  const progressMap = new Map<string, UserProgressionInfo>();

  // Traiter par batches pour éviter les requêtes trop importantes
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    
    const { data: progressData, error } = await supabase
      .from('user_lesson_progress')
      .select(`
        user_id,
        lesson_id,
        status,
        lessons!inner (
          id,
          order_index,
          levels!inner (
            id,
            order_index,
            formation_id
          )
        )
      `)
      .in('user_id', batch)
      .in('status', ['not_started', 'in_progress', 'awaiting_review', 'completed']);

    if (error) {
      console.error('Error fetching users progress:', error);
      continue;
    }

    // Regrouper par utilisateur et garder la progression maximale
    const userProgressions: { [key: string]: any } = {};
    
    progressData?.forEach(progress => {
      const userId = progress.user_id;
      const levelOrder = progress.lessons.levels.order_index;
      const lessonOrder = progress.lessons.order_index;
      
      if (!userProgressions[userId] || 
          levelOrder > userProgressions[userId].levelOrder ||
          (levelOrder === userProgressions[userId].levelOrder && lessonOrder > userProgressions[userId].lessonOrder)) {
        userProgressions[userId] = {
          userId,
          levelOrder,
          lessonOrder,
          formationId: progress.lessons.levels.formation_id
        };
      }
    });

    // Ajouter à la map
    Object.values(userProgressions).forEach((progress: any) => {
      progressMap.set(progress.userId, progress);
    });
  }

  // Ajouter les utilisateurs sans progression (niveau 0)
  userIds.forEach(userId => {
    if (!progressMap.has(userId)) {
      progressMap.set(userId, {
        userId,
        levelOrder: 0,
        lessonOrder: 0,
        formationId: '' // Sera défini selon le contexte
      });
    }
  });

  console.log('Progress map built:', progressMap.size, 'users');
  return progressMap;
};

/**
 * Vérifie si un utilisateur peut voir les messages d'un autre utilisateur
 */
export const canUserSeeMessages = (
  currentUserProgress: UserProgressionInfo,
  senderProgress: UserProgressionInfo
): boolean => {
  // L'utilisateur peut voir les messages des utilisateurs au même niveau ou inférieur
  return senderProgress.levelOrder < currentUserProgress.levelOrder || 
         (senderProgress.levelOrder === currentUserProgress.levelOrder && 
          senderProgress.lessonOrder <= currentUserProgress.lessonOrder);
};
