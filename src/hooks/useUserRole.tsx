/**
 * Hook pour déterminer le rôle de l'utilisateur dans une formation
 * Avec support offline via cache IndexedDB
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { offlineStore } from '@/offline/utils/offlineStore';

export const useUserRole = (formationId: string | undefined) => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();

  return useQuery({
    queryKey: ['user-role', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return null;

      // Mode hors ligne : utiliser le cache
      if (!isOnline) {
        console.log('📦 Offline - loading cached user role');
        const cached = await offlineStore.getCachedQuery(
          `["user-role-offline","${user.id}","${formationId}"]`
        );
        if (cached) return cached;
        
        // Fallback : si la formation est téléchargée offline, l'utilisateur est probablement étudiant
        const isOffline = await offlineStore.isFormationOffline(formationId);
        if (isOffline) {
          return { role: 'student', formationId };
        }
        return null;
      }

      console.log('Checking user role for:', user.id, 'in formation:', formationId);

      // Vérifier si l'utilisateur est professeur de cette formation spécifique via teacher_formations
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          teacher_formations!inner (
            formation_id
          )
        `)
        .eq('user_id', user.id)
        .eq('teacher_formations.formation_id', formationId)
        .maybeSingle();

      if (!teacherError && teacherData) {
        console.log('User is teacher in this formation:', teacherData);
        const result = {
          role: 'teacher',
          teacherId: teacherData.id,
          formationId: formationId
        };
        // Sauvegarder dans le cache pour accès offline
        await offlineStore.cacheQuery(
          `["user-role-offline","${user.id}","${formationId}"]`,
          result,
          30 * 24 * 60 * 60 * 1000
        );
        return result;
      }

      // Vérifier si l'utilisateur est élève de cette formation
      const { data: studentData, error: studentError } = await supabase
        .from('enrollment_requests')
        .select('id, user_id, formation_id')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('status', 'approved')
        .maybeSingle();

      if (!studentError && studentData) {
        console.log('User is student in this formation');
        const result = {
          role: 'student',
          formationId: studentData.formation_id
        };
        // Sauvegarder dans le cache pour accès offline
        await offlineStore.cacheQuery(
          `["user-role-offline","${user.id}","${formationId}"]`,
          result,
          30 * 24 * 60 * 60 * 1000
        );
        return result;
      }

      console.log('User has no role in this formation');
      return null;
    },
    enabled: !!user?.id && !!formationId,
    retry: isOnline ? 3 : false,
    staleTime: isOnline ? 1000 * 60 * 5 : Infinity,
  });
};
