/**
 * Hook pour gérer les positions des applications sur le bureau (offline-first).
 * Persiste les positions en base de données (table school_desktop_app_positions)
 * et dans le cache local pour un affichage instantané.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { offlineStore } from '@/offline/utils/offlineStore';
import { hashQueryKey } from '@/offline/utils/queryPersister';

interface AppPosition {
  app_id: string;
  position_index: number;
}

const positionsCacheKey = (userId: string, schoolId: string | null) =>
  hashQueryKey(['school-desktop-app-positions', userId, schoolId ?? null]);

const mapToObject = (m: Map<string, number>): Record<string, number> =>
  Object.fromEntries(m.entries());

const objectToMap = (o: Record<string, number>): Map<string, number> => {
  const m = new Map<string, number>();
  for (const [k, v] of Object.entries(o)) m.set(k, v);
  return m;
};

export const useDesktopAppPositions = (schoolId: string | null) => {
  const { user } = useAuth();

  // Lecture synchrone : les positions s'appliquent dès le premier rendu.
  const [appPositions, setAppPositions] = useState<Map<string, number>>(() => {
    if (!user?.id) return new Map();
    const cached = offlineStore.getCachedQuerySync(
      positionsCacheKey(user.id, schoolId),
    );
    return cached && typeof cached === 'object' ? objectToMap(cached as Record<string, number>) : new Map();
  });
  const [isLoading, setIsLoading] = useState(appPositions.size === 0);

  // Charger les positions depuis Supabase
  useEffect(() => {
    let cancelled = false;
    const loadPositions = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Repli IndexedDB si rien en mémoire
      if (appPositions.size === 0) {
        try {
          const fromIdb = await offlineStore.getCachedQuery(
            positionsCacheKey(user.id, schoolId),
          );
          if (!cancelled && fromIdb && typeof fromIdb === 'object') {
            setAppPositions(objectToMap(fromIdb as Record<string, number>));
          }
        } catch {
          /* ignore */
        }
      }

      try {
        let query = supabase
          .from('school_desktop_app_positions')
          .select('app_id, position_index')
          .eq('user_id', user.id);

        if (schoolId) {
          query = query.eq('school_id', schoolId);
        } else {
          query = query.is('school_id', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        const positionsMap = new Map<string, number>();
        (data || []).forEach(item => {
          positionsMap.set(item.app_id, item.position_index);
        });
        if (!cancelled) {
          setAppPositions(positionsMap);
          offlineStore
            .cacheQuery(positionsCacheKey(user.id, schoolId), mapToObject(positionsMap))
            .catch(() => {});
        }
      } catch (e) {
        console.error('Error loading app positions:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPositions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, schoolId]);

  // Obtenir la position d'une app
  const getAppPosition = useCallback((appId: string): number => {
    return appPositions.get(appId) ?? 999;
  }, [appPositions]);

  // Mettre à jour les positions de plusieurs apps
  const updateAppPositions = useCallback(async (updates: AppPosition[]) => {
    if (!user?.id || updates.length === 0) return false;

    try {
      // Mettre à jour l'état local immédiatement
      setAppPositions(prev => {
        const newMap = new Map(prev);
        updates.forEach(u => newMap.set(u.app_id, u.position_index));
        return newMap;
      });

      // Upsert en base de données
      const upsertData = updates.map(update => ({
        user_id: user.id,
        school_id: schoolId,
        app_id: update.app_id,
        position_index: update.position_index,
      }));

      const { error } = await supabase
        .from('school_desktop_app_positions')
        .upsert(upsertData, { 
          onConflict: 'user_id,school_id,app_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Error updating app positions:', e);
      return false;
    }
  }, [user?.id, schoolId]);

  return {
    appPositions,
    isLoading,
    getAppPosition,
    updateAppPositions,
  };
};
 