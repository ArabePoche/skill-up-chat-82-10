/**
 * Hook pour gérer les positions des applications sur le bureau
 * Persiste les positions en base de données (table school_desktop_app_positions)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AppPosition {
  app_id: string;
  position_index: number;
}

export const useDesktopAppPositions = (schoolId: string | null) => {
  const { user } = useAuth();
  const [appPositions, setAppPositions] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Charger les positions depuis Supabase
  useEffect(() => {
    const loadPositions = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
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
        setAppPositions(positionsMap);
      } catch (e) {
        console.error('Error loading app positions:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadPositions();
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
 