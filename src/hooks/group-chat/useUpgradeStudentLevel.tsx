/**
 * Hook pour upgrader manuellement un élève à un ou plusieurs niveaux supérieurs
 * Utilisé par les professeurs pour les élèves qui maîtrisent déjà certains niveaux
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LevelInfo {
  id: string;
  title: string;
  order_index: number;
  description?: string;
}

/**
 * Récupère les niveaux disponibles au-dessus du niveau actuel de l'élève
 */
export const useAvailableLevelsForUpgrade = (formationId: string, currentLevelId: string) => {
  return useQuery({
    queryKey: ['available-levels-upgrade', formationId, currentLevelId],
    queryFn: async () => {
      // Récupérer l'order_index du niveau actuel
      const { data: currentLevel, error: currentError } = await supabase
        .from('levels')
        .select('order_index')
        .eq('id', currentLevelId)
        .single();

      if (currentError || !currentLevel) {
        console.error('Error fetching current level:', currentError);
        return [];
      }

      // Récupérer tous les niveaux supérieurs
      const { data: levels, error } = await supabase
        .from('levels')
        .select('id, title, order_index, description')
        .eq('formation_id', formationId)
        .gt('order_index', currentLevel.order_index)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching levels for upgrade:', error);
        return [];
      }

      return (levels || []) as LevelInfo[];
    },
    enabled: !!formationId && !!currentLevelId,
  });
};

/**
 * Mutation pour upgrader un élève à un niveau cible
 * Débloque tous les niveaux intermédiaires + le niveau cible
 */
export const useUpgradeStudentLevel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      formationId,
      currentLevelId,
      targetLevelId,
      intermediateLevelIds = [],
    }: {
      studentId: string;
      formationId: string;
      currentLevelId: string;
      targetLevelId: string;
      /** IDs des niveaux intermédiaires à débloquer (choix du professeur) */
      intermediateLevelIds?: string[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      console.log('🚀 Upgrading student level:', { studentId, formationId, currentLevelId, targetLevelId, intermediateLevelIds });

      // 1. Récupérer les infos des niveaux concernés
      const levelIdsToUnlock = [...intermediateLevelIds, targetLevelId];
      const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .select('id, title, order_index')
        .eq('formation_id', formationId)
        .in('id', levelIdsToUnlock)
        .order('order_index', { ascending: true });

      if (levelsError || !levels) throw levelsError;

      const targetLevel = levels.find(l => l.id === targetLevelId);
      if (!targetLevel) throw new Error('Niveau cible introuvable');

      const levelsToUnlock = levels;

      for (const level of levelsToUnlock) {
        // Envoyer notification de déblocage
        await supabase
          .from('notifications')
          .insert({
            user_id: studentId,
            title: 'Niveau débloqué par le professeur !',
            message: `Votre professeur vous a promu au niveau "${level.title}". Vous pouvez maintenant y accéder.`,
            type: 'success',
            formation_id: formationId,
          });

        // Récupérer la première leçon de ce niveau pour la présenter
        const { data: firstLesson } = await supabase
          .from('lessons')
          .select('id, title, description')
          .eq('level_id', level.id)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstLesson) {
          // Créer l'entrée de progression pour la première leçon du niveau
          const { error: progressError } = await supabase
            .from('user_lesson_progress')
            .upsert({
              user_id: studentId,
              lesson_id: firstLesson.id,
              level_id: level.id,
              status: 'not_started',
              exercise_completed: false,
            }, { onConflict: 'user_id,lesson_id' });

          if (progressError) {
            console.error('Error creating lesson progress for upgrade:', progressError);
          }

          // Créer un message système de présentation de la leçon
          await supabase
            .from('lesson_messages')
            .insert({
              lesson_id: firstLesson.id,
              formation_id: formationId,
              receiver_id: studentId,
              sender_id: studentId,
              content: `🚀 **Niveau débloqué par le professeur :**\n\n**${level.title}**\n\nVotre professeur a estimé que vous maîtrisez les niveaux précédents. Vous pouvez maintenant commencer la leçon "${firstLesson.title}".`,
              message_type: 'system',
              is_system_message: true,
            });
        }
      }

      return { levelsUnlocked: levelsToUnlock.length, targetLevel };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['group-progression'] });
      queryClient.invalidateQueries({ queryKey: ['level-members'] });
      queryClient.invalidateQueries({ queryKey: ['current-progression-status'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-unlocking'] });
      queryClient.invalidateQueries({ queryKey: ['student-progression'] });

      toast.success(
        data.levelsUnlocked > 1
          ? `${data.levelsUnlocked} niveaux débloqués jusqu'à "${data.targetLevel.title}" !`
          : `Niveau "${data.targetLevel.title}" débloqué !`
      );
    },
    onError: (error) => {
      console.error('Error upgrading student level:', error);
      toast.error("Erreur lors de la promotion de l'élève");
    },
  });
};
