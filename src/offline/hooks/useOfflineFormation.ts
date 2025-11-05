/**
 * Hook pour accéder aux formations offline
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
        }
      } else {
        // Hors ligne : charger depuis le cache
        const offlineFormation = await offlineStore.getFormation(formationId);
        const offlineLessons = await offlineStore.getLessonsByFormation(formationId);

        setFormation(offlineFormation);
        setLessons(offlineLessons);
      }

      setIsLoading(false);
    };

    loadData();
  }, [formationId, isOnline]);

  const downloadForOffline = async () => {
    if (!formationId || !isOnline) return;

    try {
      // Télécharger la formation
      const { data: formationData } = await supabase
        .from('formations')
        .select('*')
        .eq('id', formationId)
        .single();

      if (formationData) {
        await offlineStore.saveFormation(formationData);
      }

      // Télécharger les leçons via fetch direct
      const SUPABASE_URL = 'https://jiasafdbfqqhhdazoybu.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppYXNhZmRiZnFxaGhkYXpveWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTQ5MTAsImV4cCI6MjA2NTQ5MDkxMH0.TXPwCkGAZRrn83pTsZHr2QFZwX03nBWdNPJN0s_jLKQ';
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/lessons?formation_id=eq.${formationId}&order=order_index.asc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const lessonsData = await response.json();

      if (Array.isArray(lessonsData)) {
        for (const lesson of lessonsData) {
          await offlineStore.saveLesson(lesson);
        }
      }

      setIsOfflineAvailable(true);
      console.log('✅ Formation downloaded for offline use');
    } catch (error) {
      console.error('Error downloading formation:', error);
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
    isOfflineAvailable,
    isLoading,
    downloadForOffline,
    removeOffline,
  };
};
