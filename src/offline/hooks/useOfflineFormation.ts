/**
 * Hook pour accéder aux formations offline
 * Télécharge les formations avec leur structure complète (levels + lessons)
 */

import { useState, useEffect } from 'react';
import { offlineStore } from '../utils/offlineStore';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineSync } from './useOfflineSync';

export const useOfflineFormation = (formationId: string | undefined) => {
  const [formation, setFormation] = useState<any | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useOfflineSync();

  useEffect(() => {
    if (!formationId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);

      // Vérifier si disponible offline
      const isOffline = await offlineStore.isFormationOffline(formationId);
      setIsOfflineAvailable(isOffline);

      if (isOnline) {
        // En ligne : charger depuis Supabase
        try {
          const { data: formationData } = await supabase
            .from('formations')
            .select('*')
            .eq('id', formationId)
            .single();

          // @ts-expect-error - Complex Supabase type inference issue
          const lessonsResult = await supabase
            .from('lessons')
            .select('*')
            .eq('formation_id', formationId)
            .order('order_index', { ascending: true });
          
          const lessonsData = lessonsResult.data;
          
          setFormation(formationData);
          setLessons(lessonsData || []);
        } catch (error) {
          console.error('Error loading online data:', error);
          // Fallback vers le cache si erreur réseau
          if (isOffline) {
            await loadFromCache(formationId);
          }
        }
      } else {
        // Hors ligne : charger depuis le cache
        await loadFromCache(formationId);
      }

      setIsLoading(false);
    };

    const loadFromCache = async (fId: string) => {
      const offlineFormation = await offlineStore.getFormation(fId);
      const offlineLessons = await offlineStore.getLessonsByFormation(fId);

      setFormation(offlineFormation);
      setLessons(offlineLessons);
    };

    loadData();
  }, [formationId, isOnline]);

  /**
   * Télécharge la formation COMPLÈTE avec levels et lessons pour usage offline
   */
  const downloadForOffline = async () => {
    if (!formationId || !isOnline) return;

    try {
      // Télécharger la formation avec sa structure complète (levels + lessons + exercises)
      const { data: fullFormation, error: formationError } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (
            id,
            first_name,
            last_name,
            username
          ),
          levels (
            *,
            lessons (
              *,
              exercises!exercises_lesson_id_fkey (
                id,
                title,
                description,
                content,
                type
              )
            )
          )
        `)
        .eq('id', formationId)
        .single();

      if (formationError) {
        console.error('Error downloading formation:', formationError);
        throw formationError;
      }

      if (fullFormation) {
        // Sauvegarder la formation complète (avec levels imbriqués)
        await offlineStore.saveFormation(fullFormation);
        console.log('✅ Formation saved with levels:', fullFormation.levels?.length || 0, 'levels');

        // Sauvegarder aussi chaque leçon individuellement pour accès par formation_id
        if (fullFormation.levels) {
          for (const level of fullFormation.levels) {
            for (const lesson of level.lessons || []) {
              await offlineStore.saveLesson({
                ...lesson,
                formation_id: formationId,
                level_id: level.id,
                level_title: level.title,
                level_order_index: level.order_index,
              });
            }
          }
        }
      }

      // Sauvegarder la progression de l'élève pour accès offline
      try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        
        if (userId) {
          // Récupérer la progression de l'utilisateur pour cette formation
          const { data: progressData, error: progressError } = await supabase
            .from('user_lesson_progress')
            .select(`
              lesson_id,
              status,
              exercise_completed,
              completed_at,
              lessons!inner (
                id,
                order_index,
                level_id,
                levels!inner (
                  id,
                  order_index,
                  formation_id
                )
              )
            `)
            .eq('user_id', userId)
            .eq('lessons.levels.formation_id', formationId);

          if (!progressError && progressData && progressData.length > 0) {
            const progressBatch = progressData.map((p: any) => ({
              userId,
              lessonId: p.lesson_id,
              formationId,
              levelId: p.lessons.levels.id,
              levelOrderIndex: p.lessons.levels.order_index,
              lessonOrderIndex: p.lessons.order_index,
              status: p.status,
              exerciseCompleted: p.exercise_completed || false,
              completedAt: p.completed_at,
            }));

            await offlineStore.saveUserProgressBatch(progressBatch);
            console.log('📊 User progress saved offline:', progressBatch.length, 'entries');
          }

          // Sauvegarder le rôle utilisateur
          const { data: enrollmentData } = await supabase
            .from('enrollment_requests')
            .select('*')
            .eq('user_id', userId)
            .eq('formation_id', formationId)
            .eq('status', 'approved')
            .maybeSingle();

          if (enrollmentData) {
            await offlineStore.cacheQuery(
              `["user-role-offline","${userId}","${formationId}"]`,
              { role: 'student', formationId },
              30 * 24 * 60 * 60 * 1000 // 30 jours
            );
          }

          // Sauvegarder l'abonnement
          const { data: subscriptionData } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('formation_id', formationId)
            .maybeSingle();

          if (subscriptionData) {
            await offlineStore.cacheQuery(
              `["user-subscription-offline","${userId}","${formationId}"]`,
              subscriptionData,
              30 * 24 * 60 * 60 * 1000
            );
          }
        }
      } catch (e) {
        console.warn('Could not cache user metadata/progress for offline:', e);
      }

      setIsOfflineAvailable(true);
      console.log('✅ Formation downloaded for offline use (with full structure)');
    } catch (error) {
      console.error('Error downloading formation:', error);
      throw error;
    }
  };

  const removeOffline = async () => {
    if (!formationId) return;

    try {
      await offlineStore.deleteFormation(formationId);
      setIsOfflineAvailable(false);
      console.log('🗑️ Formation removed from offline');
    } catch (error) {
      console.error('Error removing offline formation:', error);
    }
  };

  return {
    formation,
    lessons,
    isOnline,
    isOfflineAvailable,
    isLoading,
    downloadForOffline,
    removeOffline,
  };
};
