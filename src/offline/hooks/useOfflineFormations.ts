/**
 * Hook offline-first pour récupérer les formations
 * Charge d'abord depuis le cache IndexedDB, puis synchronise avec le serveur
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineStore } from '../utils/offlineStore';
import { useOfflineSync } from './useOfflineSync';
import { useState, useEffect, useRef } from 'react';

export const useOfflineFormations = () => {
  const { isOnline } = useOfflineSync();
  const [cachedFormations, setCachedFormations] = useState<any[]>([]);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const cachedFormationsRef = useRef<any[]>([]);

  // Charger depuis le cache au montage
  useEffect(() => {
    const loadCache = async () => {
      try {
        // Charger les formations téléchargées offline
        const offlineData = await offlineStore.getAllFormations();
        
        if (offlineData && offlineData.length > 0) {
          setCachedFormations(offlineData);
          cachedFormationsRef.current = offlineData;
        }
        
        // Aussi vérifier le cache de requêtes
        const queryCache = await offlineStore.getCachedQuery('["formations"]');
        if (queryCache && queryCache.length > 0) {
          // Merger : garder les formations offline + celles du query cache
          const mergedMap = new Map();
          
          // D'abord ajouter les formations du query cache
          for (const f of queryCache) {
            mergedMap.set(f.id, f);
          }
          
          // Ensuite les formations offline (priorité car elles ont la structure complète)
          for (const f of offlineData) {
            mergedMap.set(f.id, f);
          }
          
          const merged = Array.from(mergedMap.values());
          setCachedFormations(merged);
          cachedFormationsRef.current = merged;
        }
      } catch (error) {
        console.error('Error loading cached formations:', error);
      } finally {
        setIsCacheLoaded(true);
      }
    };

    loadCache();
  }, []);

  const query = useQuery({
    queryKey: ['formations'],
    queryFn: async () => {
      // Si hors ligne, retourner le cache (utiliser la ref pour éviter les closures périmées)
      if (!isOnline) {
        console.log('📦 Offline - returning cached formations:', cachedFormationsRef.current.length);
        return cachedFormationsRef.current;
      }

      console.log('🔄 Fetching formations from server...');

      const { data, error } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (
            id,
            first_name,
            last_name,
            username
          )
        `);

      if (error) {
        console.error('Error fetching formations:', error);
        // En cas d'erreur réseau, retourner le cache
        return cachedFormationsRef.current;
      }

      // Sauvegarder dans le cache
      await offlineStore.cacheQuery('["formations"]', data || []);
      
      // Mettre à jour les formations individuelles (sans écraser celles qui ont des levels)
      for (const formation of data || []) {
        // Vérifier si on a déjà une version plus complète (avec levels)
        const existing = await offlineStore.getFormation(formation.id);
        if (!existing || !existing.levels) {
          await offlineStore.saveFormation(formation);
        }
      }

      console.log('✅ Formations synced:', data?.length);
      return data || [];
    },
    // Utiliser le cache comme données initiales
    initialData: isCacheLoaded && cachedFormations.length > 0 ? cachedFormations : undefined,
    // Désactiver le refetch si hors ligne
    refetchOnMount: isOnline,
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
    staleTime: isOnline ? 1000 * 60 * 5 : Infinity,
    enabled: isCacheLoaded,
    retry: isOnline ? 3 : false,
  });

  return {
    ...query,
    // Indicateurs supplémentaires
    isFromCache: !isOnline || (query.data === cachedFormations && cachedFormations.length > 0),
    hasOfflineData: cachedFormations.length > 0,
  };
};

/**
 * Hook offline-first pour une formation spécifique
 */
export const useOfflineFormationById = (formationId: string | undefined) => {
  const { isOnline } = useOfflineSync();
  const [cachedFormation, setCachedFormation] = useState<any | null>(null);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const cachedFormationRef = useRef<any | null>(null);

  useEffect(() => {
    if (!formationId) {
      setIsCacheLoaded(true);
      return;
    }

    const loadCache = async () => {
      try {
        const cached = await offlineStore.getFormation(formationId);
        setCachedFormation(cached);
        cachedFormationRef.current = cached;
      } catch (error) {
        console.error('Error loading cached formation:', error);
      } finally {
        setIsCacheLoaded(true);
      }
    };

    loadCache();
  }, [formationId]);

  const query = useQuery({
    queryKey: ['formation', formationId],
    queryFn: async () => {
      if (!formationId) return null;

      if (!isOnline) {
        console.log('📦 Offline - returning cached formation');
        return cachedFormationRef.current;
      }

      console.log('🔄 Fetching formation:', formationId);

      const { data, error } = await supabase
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

      if (error) {
        console.error('Error fetching formation:', error);
        return cachedFormationRef.current;
      }

      // Sauvegarder dans le cache
      await offlineStore.saveFormation(data);
      
      // Sauvegarder les leçons aussi
      if (data?.levels) {
        for (const level of data.levels) {
          for (const lesson of level.lessons || []) {
            await offlineStore.saveLesson({
              ...lesson,
              formation_id: formationId,
              level,
            });
          }
        }
      }

      return data;
    },
    enabled: !!formationId && isCacheLoaded,
    initialData: isCacheLoaded ? cachedFormation : undefined,
    refetchOnMount: isOnline,
    staleTime: isOnline ? 1000 * 60 * 5 : Infinity,
    retry: isOnline ? 3 : false,
  });

  return {
    ...query,
    isFromCache: !isOnline && cachedFormation !== null,
    hasOfflineData: cachedFormation !== null,
  };
};

/**
 * Hook offline-first pour les inscriptions utilisateur
 */
export const useOfflineUserEnrollments = (userId: string | undefined) => {
  const { isOnline } = useOfflineSync();
  const [cachedEnrollments, setCachedEnrollments] = useState<any[]>([]);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const cachedEnrollmentsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!userId) {
      setIsCacheLoaded(true);
      return;
    }

    const loadCache = async () => {
      try {
        const cacheKey = `["user-enrollments","${userId}"]`;
        const cached = await offlineStore.getCachedQuery(cacheKey);
        if (cached) {
          setCachedEnrollments(cached);
          cachedEnrollmentsRef.current = cached;
        }
      } catch (error) {
        console.error('Error loading cached enrollments:', error);
      } finally {
        setIsCacheLoaded(true);
      }
    };

    loadCache();
  }, [userId]);

  const query = useQuery({
    queryKey: ['user-enrollments', userId],
    queryFn: async () => {
      if (!userId) return [];

      if (!isOnline) {
        console.log('📦 Offline - returning cached enrollments');
        return cachedEnrollmentsRef.current;
      }

      try {
        const { data: enrollmentRequests, error: enrollmentError } = await supabase
          .from('enrollment_requests')
          .select('formation_id, created_at, status')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (enrollmentError) throw enrollmentError;

        if (!enrollmentRequests || enrollmentRequests.length === 0) {
          return [];
        }

        const formationIds = enrollmentRequests.map(req => req.formation_id);
        
        const { data: formations, error: formationsError } = await supabase
          .from('formations')
          .select(`
            *,
            profiles:author_id (id, first_name, last_name, username),
            levels (*, lessons (*, exercises!exercises_lesson_id_fkey (id, title, description, content, type)))
          `)
          .in('id', formationIds)
          .eq('is_active', true);

        if (formationsError) throw formationsError;

        const enrichedEnrollments = enrollmentRequests.map(enrollment => {
          const formation = formations?.find(f => f.id === enrollment.formation_id);
          return { ...enrollment, formations: formation };
        }).filter(e => e.formations);

        // Sauvegarder dans le cache
        const cacheKey = `["user-enrollments","${userId}"]`;
        await offlineStore.cacheQuery(cacheKey, enrichedEnrollments);

        // Sauvegarder chaque formation pour accès offline
        for (const enrollment of enrichedEnrollments) {
          if (enrollment.formations) {
            await offlineStore.saveFormation(enrollment.formations);
          }
        }

        return enrichedEnrollments;
      } catch (error) {
        console.error('Error fetching enrollments:', error);
        return cachedEnrollmentsRef.current;
      }
    },
    enabled: !!userId && isCacheLoaded,
    initialData: isCacheLoaded && cachedEnrollments.length > 0 ? cachedEnrollments : undefined,
    refetchOnMount: isOnline,
    staleTime: isOnline ? 1000 * 60 * 5 : Infinity,
    retry: isOnline ? 3 : false,
  });

  return {
    ...query,
    isFromCache: !isOnline && cachedEnrollments.length > 0,
    hasOfflineData: cachedEnrollments.length > 0,
  };
};
