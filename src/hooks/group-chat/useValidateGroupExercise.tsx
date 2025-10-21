/**
 * Hook spécifique pour valider les exercices dans le contexte du chat de groupe
 * Adapté pour la logique basée sur le niveau (level) avec gestion des promotions
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useValidateGroupExercise = (formationId?: string, levelId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      messageId,
      isValid,
      rejectReason,
      exerciseId,
      lessonId,
      targetLevelId,
      targetFormationId,
      rejectAudioUrl,
      rejectAudioDuration,
      rejectFilesUrls
    }: {
      messageId: string;
      isValid: boolean;
      rejectReason?: string;
      exerciseId: string;
      lessonId: string;
      targetLevelId?: string;
      targetFormationId?: string;
      rejectAudioUrl?: string | null;
      rejectAudioDuration?: number | null;
      rejectFilesUrls?: string[];
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Utiliser les IDs fournis ou ceux du hook
      const effectiveLevelId = targetLevelId || levelId;
      let effectiveFormationId = targetFormationId || formationId;
      
      // Si on n'a pas de formationId, le récupérer depuis le niveau
      if (!effectiveFormationId && effectiveLevelId) {
        const { data: levelData } = await supabase
          .from('levels')
          .select('formation_id')
          .eq('id', effectiveLevelId)
          .single();
        
        effectiveFormationId = levelData?.formation_id;
      }

      if (!effectiveFormationId || !effectiveLevelId) {
        throw new Error('Formation ID ou Level ID manquant');
      }

      console.log('🔄 Validating group exercise:', { 
        messageId, 
        isValid, 
        exerciseId, 
        lessonId, 
        levelId: effectiveLevelId, 
        formationId: effectiveFormationId 
      });

      try {
        // 1. Récupérer l'utilisateur qui a soumis l'exercice
        const { data: exerciseMessage, error: messageError } = await supabase
          .from('lesson_messages')
          .select('sender_id')
          .eq('id', messageId)
          .single();

        if (messageError || !exerciseMessage) {
          throw new Error('Could not find exercise submission');
        }

        const studentId = exerciseMessage.sender_id;

        // 2. Mettre à jour les fichiers de rejet si rejet
        if (!isValid) {
          const updateData: any = {};
          
          if (rejectReason) {
            updateData.content = `❌ Exercice rejeté. Raison : ${rejectReason}`;
          }
          if (rejectAudioUrl) {
            updateData.reject_audio_url = rejectAudioUrl;
            updateData.reject_audio_duration = rejectAudioDuration;
          }
          if (rejectFilesUrls && rejectFilesUrls.length > 0) {
            updateData.reject_files_urls = rejectFilesUrls;
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('lesson_messages')
              .update(updateData)
              .eq('id', messageId);
          }
        }

        // 3. Appeler la fonction globale de validation qui gère TOUTE la logique
        // (déblocage exercices/leçons/niveaux + messages système)
        const { data: validationResult, error: validationError } = await supabase.rpc(
          'validate_exercise_submission_global',
          {
            p_message_id: messageId,
            p_user_id: studentId,
            p_is_approved: isValid,
            p_reject_reason: rejectReason || null,
            p_teacher_id: user.id
          }
        );

        if (validationError) {
          console.error('Error in global validation:', validationError);
          throw validationError;
        }

        console.log('✅ Global validation completed:', validationResult);

        // La fonction SQL gère toute la progression, on retourne juste le résultat
        const result = validationResult as any;
        
        return { 
          progressionUpdate: result?.next_exercise_unlocked ? 'next_exercise' 
            : result?.next_lesson_unlocked ? 'next_lesson'
            : result?.level_completed ? 'level_completed'
            : result?.formation_completed ? 'formation_completed'
            : null,
          validationResult: result
        };

      } catch (error) {
        console.error('Error in group exercise validation:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalider les requêtes spécifiques au chat de groupe
      const effectiveLevelId = variables.targetLevelId || levelId;
      const effectiveFormationId = variables.targetFormationId || formationId;
      
      const queriesToInvalidate = [
        ['group-chat-messages', effectiveFormationId, effectiveLevelId],
        ['level-exercises', effectiveLevelId],
        ['lesson-unlocking'],
        ['user-lesson-progress'],
        ['student-progression', effectiveFormationId]
      ];

      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.refetchQueries({ queryKey });
      });

      // Messages de succès basés sur le résultat de la fonction SQL
      const result = data.validationResult as any;
      if (result?.formation_completed) {
        toast.success('🏆 Formation terminée ! Félicitations !');
      } else if (result?.level_completed) {
        toast.success('🎖️ Niveau terminé ! Niveau suivant débloqué.');
      } else if (result?.next_lesson_unlocked) {
        toast.success('🎉 Leçon terminée ! Leçon suivante débloquée.');
      } else if (result?.next_exercise_unlocked) {
        toast.success('✅ Exercice validé ! Prochain exercice débloqué.');
      } else if (result?.rejected) {
        toast.success('Exercice rejeté');
      } else {
        toast.success('Validation effectuée');
      }
    },
    onError: (error) => {
      console.error('Error validating group exercise:', error);
      toast.error('Erreur lors de la validation de l\'exercice');
    },
  });
};