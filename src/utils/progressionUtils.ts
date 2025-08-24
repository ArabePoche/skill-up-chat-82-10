import { supabase } from '@/integrations/supabase/client';

export interface UserProgress {
  levelOrder: number;
  lessonOrder: number;
}

/**
 * Utilitaire pour récupérer la progression maximale des utilisateurs
 */
export const getUsersProgressMap = async (userIds: string[]): Promise<Map<string, UserProgress>> => {
  if (userIds.length === 0) return new Map();

  

  const { data: usersProgress, error } = await supabase
    .from('user_lesson_progress')
    .select(`
      user_id,
      lesson_id,
      lessons!inner(
        id,
        order_index,
        level_id,
        levels!inner(
          order_index
        )
      )
    `)
    .in('user_id', userIds);

  if (error) {
    console.error('Error fetching users progress:', error);
    return new Map();
  }

  // Créer un map des progressions maximales par utilisateur
  const userProgressMap = new Map<string, UserProgress>();
  
  usersProgress?.forEach(progress => {
    const userId = progress.user_id;
    const levelOrder = progress.lessons?.levels?.order_index || 0;
    const lessonOrder = progress.lessons?.order_index || 0;
    
    // Garder seulement la progression maximale pour chaque utilisateur
    if (!userProgressMap.has(userId) || 
        levelOrder > userProgressMap.get(userId)!.levelOrder ||
        (levelOrder === userProgressMap.get(userId)!.levelOrder && lessonOrder > userProgressMap.get(userId)!.lessonOrder)) {
      userProgressMap.set(userId, { levelOrder, lessonOrder });
    }
  });

  
  return userProgressMap;
};

/**
 * Récupère la progression actuelle d'un utilisateur spécifique
 */
export const getCurrentUserProgress = async (userId: string, formationId: string): Promise<UserProgress> => {
  

  // Récupérer la progression maximale de l'utilisateur dans cette formation
  const { data: userProgress, error } = await supabase
    .from('user_lesson_progress')
    .select(`
      lesson_id,
      lessons!inner(
        id,
        order_index,
        level_id,
        levels!inner(
          order_index,
          formation_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('lessons.levels.formation_id', formationId);

  if (error) {
    console.error('Error fetching current user progress:', error);
    return { levelOrder: 0, lessonOrder: 0 };
  }

  // Trouver la progression maximale
  let maxProgress = { levelOrder: 0, lessonOrder: 0 };
  
  userProgress?.forEach(progress => {
    const levelOrder = progress.lessons?.levels?.order_index || 0;
    const lessonOrder = progress.lessons?.order_index || 0;
    
    if (levelOrder > maxProgress.levelOrder ||
        (levelOrder === maxProgress.levelOrder && lessonOrder > maxProgress.lessonOrder)) {
      maxProgress = { levelOrder, lessonOrder };
    }
  });

  console.log('Current user max progress:', maxProgress);
  return maxProgress;
};