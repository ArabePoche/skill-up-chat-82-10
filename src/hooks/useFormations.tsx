import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineStore } from '@/offline/utils/offlineStore';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { useState, useEffect } from 'react';

export const useFormations = () => {
  return useQuery({
    queryKey: ['formations'],
    queryFn: async () => {
      console.log('Fetching formations...');

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
        throw error;
      }

      console.log('Formations fetched:', data);
      return data || [];
    },
  });
};

/**
 * Hook offline-first pour récupérer une formation par ID
 * Charge depuis le cache si hors ligne, sinon depuis Supabase
 */
export const useFormationById = (formationId: string | undefined) => {
  const { isOnline } = useOfflineSync();
  const [cachedFormation, setCachedFormation] = useState<any | null>(null);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);

  // Charger depuis le cache au montage
  useEffect(() => {
    if (!formationId) {
      setIsCacheLoaded(true);
      return;
    }

    const loadCache = async () => {
      try {
        const cached = await offlineStore.getFormation(formationId);
        if (cached) {
          console.log('📦 Formation loaded from cache:', formationId);
          setCachedFormation(cached);
        }
      } catch (error) {
        console.error('Error loading cached formation:', error);
      } finally {
        setIsCacheLoaded(true);
      }
    };

    loadCache();
  }, [formationId]);

  return useQuery({
    queryKey: ['formation', formationId],
    queryFn: async () => {
      if (!formationId) return null;

      // Si hors ligne, retourner le cache
      if (!isOnline) {
        console.log('📴 Offline - returning cached formation:', formationId);
        if (cachedFormation) {
          return cachedFormation;
        }
        throw new Error('Formation non disponible hors ligne');
      }

      console.log('🔄 Fetching formation by ID:', formationId);

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
        // En cas d'erreur réseau, retourner le cache si disponible
        if (cachedFormation) {
          console.log('📦 Network error - returning cached formation');
          return cachedFormation;
        }
        throw error;
      }

      // Sauvegarder dans le cache pour accès offline
      await offlineStore.saveFormation(data);
      console.log('✅ Formation cached for offline:', formationId);

      return data;
    },
    enabled: !!formationId && isCacheLoaded,
    initialData: isCacheLoaded ? cachedFormation : undefined,
    refetchOnMount: isOnline,
    staleTime: isOnline ? 1000 * 60 * 5 : Infinity,
    retry: isOnline ? 3 : false,
  });
};

export const useUserEnrollments = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-enrollments', userId],
    queryFn: async () => {
      if (!userId) {
        console.log('No user ID provided for enrollments');
        return [];
      }

      console.log('Fetching user enrollments for:', userId);

      try {
        // Récupérer les demandes d'inscription approuvées
        const { data: enrollmentRequests, error: enrollmentError } = await supabase
          .from('enrollment_requests')
          .select('formation_id, created_at, status')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (enrollmentError) {
          console.error('Error fetching enrollment requests:', enrollmentError);
          throw enrollmentError;
        }

        console.log('Enrollment requests found:', enrollmentRequests);

        if (!enrollmentRequests || enrollmentRequests.length === 0) {
          console.log('No approved enrollments found for user:', userId);
          return [];
        }

        // Récupérer les détails des formations pour les inscriptions approuvées
        const formationIds = enrollmentRequests.map(req => req.formation_id);
        
        // Simplifier la requête pour éviter l'erreur de relation ambiguë
        const { data: formations, error: formationsError } = await supabase
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
          .in('id', formationIds)
          .eq('is_active', true);

        if (formationsError) {
          console.error('Error fetching formations details:', formationsError);
          throw formationsError;
        }

        console.log('Formations details fetched:', formations);

        // Combiner les données d'inscription avec les formations
        const enrichedEnrollments = enrollmentRequests.map(enrollment => {
          const formation = formations?.find(f => f.id === enrollment.formation_id);
          return {
            ...enrollment,
            formations: formation
          };
        }).filter(enrollment => enrollment.formations); // Filtrer les formations qui n'existent plus

        console.log('Final enriched enrollments:', enrichedEnrollments);
        return enrichedEnrollments;
      } catch (error) {
        console.error('Complete error in useUserEnrollments:', error);
        // Retourner un tableau vide plutôt que de throw l'erreur
        // pour éviter de casser l'interface utilisateur
        return [];
      }
    },
    enabled: !!userId,
    retry: 3,
    retryDelay: 1000,
  });
};
