/**
 * Hook pour accéder à la progression de l'élève en mode offline
 * Retourne la progression depuis IndexedDB quand l'utilisateur est hors ligne
 */

import { useQuery } from '@tanstack/react-query';
import { offlineStore } from '../utils/offlineStore';
import { useOfflineSync } from './useOfflineSync';
import { useAuth } from '@/hooks/useAuth';

export interface OfflineProgressionEntry {
  lessonId: string;
  levelId: string;
  levelOrderIndex: number;
  lessonOrderIndex: number;
  status: 'not_started' | 'in_progress' | 'awaiting_review' | 'completed';
  exerciseCompleted: boolean;
  completedAt?: string;
}

export interface OfflineMaxProgress {
  levelOrder: number;
  lessonOrder: number;
  status: string;
}

/**
 * Récupère la progression complète d'un utilisateur pour une formation (offline-aware)
 */
export const useOfflineProgression = (formationId?: string) => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();

  return useQuery({
    queryKey: ['offline-progression', user?.id, formationId, isOnline],
    queryFn: async (): Promise<OfflineProgressionEntry[]> => {
      if (!user?.id || !formationId) return [];

      const progressList = await offlineStore.getUserProgressByFormation(user.id, formationId);

      return progressList.map(p => ({
        lessonId: p.lessonId,
        levelId: p.levelId,
        levelOrderIndex: p.levelOrderIndex,
        lessonOrderIndex: p.lessonOrderIndex,
        status: p.status,
        exerciseCompleted: p.exerciseCompleted,
        completedAt: p.completedAt,
      }));
    },
    enabled: !!user?.id && !!formationId && !isOnline,
    staleTime: Infinity, // Les données offline ne changent pas tant qu'on est offline
  });
};

/**
 * Récupère le niveau maximum atteint (offline-aware)
 */
export const useOfflineMaxProgress = (formationId?: string) => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();

  return useQuery({
    queryKey: ['offline-max-progress', user?.id, formationId, isOnline],
    queryFn: async (): Promise<OfflineMaxProgress> => {
      if (!user?.id || !formationId) {
        return { levelOrder: 0, lessonOrder: 0, status: 'not_started' };
      }

      return offlineStore.getUserMaxProgress(user.id, formationId);
    },
    enabled: !!user?.id && !!formationId && !isOnline,
    staleTime: Infinity,
  });
};
