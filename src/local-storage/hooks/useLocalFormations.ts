/**
 * Hook pour gérer les formations avec stockage local
 * Téléchargement offline et sync automatique
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formationStore } from '../stores/FormationStore';
import { FormationData } from '../types';
import { useAuth } from '@/hooks/useAuth';

interface UseLocalFormationsReturn {
  formations: FormationData[];
  isLoading: boolean;
  isFromCache: boolean;
  downloadFormation: (formationId: string) => Promise<void>;
  isDownloading: boolean;
  downloadProgress: number;
  getOfflineFormations: () => Promise<FormationData[]>;
  isFormationOffline: (formationId: string) => Promise<boolean>;
  deleteOfflineFormation: (formationId: string) => Promise<void>;
  refreshFormations: () => Promise<void>;
}

export const useLocalFormations = (): UseLocalFormationsReturn => {
  const { user } = useAuth();
  const [isFromCache, setIsFromCache] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cachedFormations, setCachedFormations] = useState<FormationData[]>([]);

  // Charge les formations offline au démarrage
  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await formationStore.getAllFormations();
        setCachedFormations(cached);
        if (cached.length > 0) {
          setIsFromCache(true);
        }
      } catch (err) {
        console.error('Error loading cached formations:', err);
      }
    };
    loadCached();
  }, []);

  // Query React Query avec cache local
  const { data: formations = [], isLoading, refetch } = useQuery({
    queryKey: ['local-formations', user?.id],
    queryFn: async () => {
      // Si hors ligne, retourner le cache
      if (!navigator.onLine) {
        console.log('📦 Offline - using cached formations');
        return cachedFormations;
      }

      // Récupérer les inscriptions
      if (!user) return cachedFormations;

      try {
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('enrollment_requests')
          .select('formation_id')
          .eq('user_id', user.id)
          .eq('status', 'approved');

        if (enrollmentError) throw enrollmentError;

        if (!enrollments || enrollments.length === 0) {
          return cachedFormations;
        }

        const formationIds = enrollments.map(e => e.formation_id);

        const { data: formationsData, error: formationsError } = await supabase
          .from('formations')
          .select(`
            *,
            profiles:author_id (id, first_name, last_name, username, avatar_url),
            levels (
              *,
              lessons (
                id, title, description, video_url, order_index, has_exercise,
                exercises!exercises_lesson_id_fkey (id, title, description, type)
              )
            )
          `)
          .in('id', formationIds)
          .eq('is_active', true);

        if (formationsError) throw formationsError;

        // Sauvegarder dans le cache local
        for (const formation of formationsData || []) {
          await formationStore.saveFormation(formation as FormationData, false);
        }

        setIsFromCache(false);
        return (formationsData || []) as FormationData[];
      } catch (error) {
        console.error('Error fetching formations:', error);
        return cachedFormations;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    initialData: cachedFormations.length > 0 ? cachedFormations : undefined,
  });

  // Télécharge une formation complète pour accès offline
  const downloadFormation = useCallback(async (formationId: string) => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Récupérer la formation complète
      const { data: formation, error } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (id, first_name, last_name, username, avatar_url),
          levels (
            *,
            lessons (
              *,
              exercises!exercises_lesson_id_fkey (*)
            )
          )
        `)
        .eq('id', formationId)
        .single();

      if (error) throw error;

      setDownloadProgress(20);

      // Sauvegarder la formation
      await formationStore.saveFormation(formation as FormationData, true);
      setDownloadProgress(40);

      // Télécharger les médias des leçons
      const levels = formation.levels || [];
      const totalLessons = levels.reduce((acc: number, l: any) => acc + (l.lessons?.length || 0), 0);
      let processedLessons = 0;

      for (const level of levels) {
        for (const lesson of level.lessons || []) {
          // Sauvegarder la leçon
          await formationStore.saveLesson(lesson, formationId, level.id);

          // Télécharger l'audio/vidéo si présent
          if (lesson.video_url) {
            // Pour les vidéos, on ne télécharge que le thumbnail pour économiser
            // Les vidéos sont trop volumineuses pour un stockage offline complet
            console.log('📹 Video URL stored (not downloaded):', lesson.title);
          }

          processedLessons++;
          setDownloadProgress(40 + (processedLessons / totalLessons) * 60);
        }
      }

      setDownloadProgress(100);
      console.log('✅ Formation downloaded for offline use:', formation.title);
    } catch (error) {
      console.error('Error downloading formation:', error);
      throw error;
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, []);

  // Récupère les formations téléchargées
  const getOfflineFormations = useCallback(async (): Promise<FormationData[]> => {
    return formationStore.getAllFormations();
  }, []);

  // Vérifie si une formation est disponible offline
  const isFormationOffline = useCallback(async (formationId: string): Promise<boolean> => {
    return formationStore.isFormationDownloaded(formationId);
  }, []);

  // Supprime une formation offline
  const deleteOfflineFormation = useCallback(async (formationId: string) => {
    await formationStore.deleteFormation(formationId);
    const remaining = await formationStore.getAllFormations();
    setCachedFormations(remaining);
  }, []);

  // Rafraîchit les formations
  const refreshFormations = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    formations,
    isLoading,
    isFromCache,
    downloadFormation,
    isDownloading,
    downloadProgress,
    getOfflineFormations,
    isFormationOffline,
    deleteOfflineFormation,
    refreshFormations,
  };
};

/**
 * Hook pour une formation spécifique
 */
export const useLocalFormation = (formationId: string | undefined) => {
  const [formation, setFormation] = useState<FormationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    if (!formationId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);

      // D'abord charger depuis le cache
      const cached = await formationStore.getFormation(formationId);
      if (cached) {
        setFormation(cached);
        setIsFromCache(true);
      }

      // Puis sync avec le serveur si en ligne
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('formations')
            .select(`
              *,
              profiles:author_id (id, first_name, last_name, username),
              levels (
                *,
                lessons (
                  *,
                  exercises!exercises_lesson_id_fkey (*)
                )
              )
            `)
            .eq('id', formationId)
            .single();

          if (!error && data) {
            await formationStore.saveFormation(data as FormationData, false);
            setFormation(data as FormationData);
            setIsFromCache(false);
          }
        } catch (err) {
          console.error('Error fetching formation:', err);
        }
      }

      setIsLoading(false);
    };

    load();
  }, [formationId]);

  return { formation, isLoading, isFromCache };
};
