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
      targetFormationId
    }: {
      messageId: string;
      isValid: boolean;
      rejectReason?: string;
      exerciseId: string;
      lessonId: string;
      targetLevelId?: string;
      targetFormationId?: string;
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
        // 1. Mettre à jour le statut de l'exercice directement
        const { error: updateError } = await supabase
          .from('lesson_messages')
          .update({
            exercise_status: isValid ? 'approved' : 'rejected',
            content: rejectReason && !isValid ? `❌ Exercice rejeté. Raison : ${rejectReason}` : undefined
          })
          .eq('id', messageId);

        if (updateError) {
          console.error('Error updating exercise status:', updateError);
          throw updateError;
        }

        if (!isValid) {
          console.log('❌ Exercise rejected, no progression');
          
          // Récupérer l'utilisateur qui a soumis l'exercice pour réinitialiser son progrès
          const { data: exerciseMessage, error: messageError } = await supabase
            .from('lesson_messages')
            .select('sender_id')
            .eq('id', messageId)
            .single();

          if (exerciseMessage) {
            // Réinitialiser la leçon à 'in_progress'
            await supabase
              .from('user_lesson_progress')
              .update({
                status: 'in_progress',
                exercise_completed: false
              })
              .eq('user_id', exerciseMessage.sender_id)
              .eq('lesson_id', lessonId);
          }

          return { progressionUpdate: null };
        }

        // 2. Si approuvé, utiliser la logique de progression existante
        console.log('✅ Exercise approved, checking progression...');

        // Récupérer l'utilisateur qui a soumis l'exercice
        const { data: exerciseMessage, error: messageError } = await supabase
          .from('lesson_messages')
          .select('sender_id')
          .eq('id', messageId)
          .single();

        if (messageError || !exerciseMessage) {
          throw new Error('Could not find exercise submission');
        }

        const studentId = exerciseMessage.sender_id;

        // 3. Récupérer tous les exercices de la leçon
        const { data: allLessonExercises, error: exercisesError } = await supabase
          .from('exercises')
          .select('id')
          .eq('lesson_id', lessonId)
          .order('created_at', { ascending: true });

        if (exercisesError) {
          throw exercisesError;
        }

        // 4. Vérifier combien d'exercices de cette leçon sont déjà validés
        const { data: approvedExercises, error: approvedError } = await supabase
          .from('lesson_messages')
          .select('exercise_id')
          .eq('sender_id', studentId)
          .eq('lesson_id', lessonId)
          .eq('exercise_status', 'approved')
          .eq('is_exercise_submission', true);

        if (approvedError) {
          throw approvedError;
        }

        const approvedExerciseIds = new Set(approvedExercises?.map(e => e.exercise_id) || []);
        approvedExerciseIds.add(exerciseId); // Ajouter l'exercice qu'on vient d'approuver

        console.log('📊 Group progression check:', {
          totalExercises: allLessonExercises?.length || 0,
          approvedExercises: approvedExerciseIds.size,
          levelId,
          formationId
        });

        // 5. Vérifier s'il y a un prochain exercice à présenter
        const nextExercise = allLessonExercises?.find(ex => !approvedExerciseIds.has(ex.id));

        if (nextExercise) {
          console.log('📝 Next exercise found for group:', nextExercise.id);
          
        // Présenter le prochain exercice via message système
        await presentNextExerciseToStudent(studentId, nextExercise.id, lessonId, effectiveFormationId, effectiveLevelId);
          
          return { 
            progressionUpdate: 'next_exercise',
            nextExerciseId: nextExercise.id 
          };
        }

        // 6. Si tous les exercices de la leçon sont terminés, gérer la progression
        console.log('🎉 All lesson exercises completed in group, checking for next lesson...');

        // Marquer la leçon comme complétée
        await supabase
          .from('user_lesson_progress')
          .update({
            status: 'completed',
            exercise_completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('user_id', studentId)
          .eq('lesson_id', lessonId);

        // Trouver la leçon suivante dans le même niveau
        const { data: allLevelLessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, order_index, title')
          .eq('level_id', levelId)
          .order('order_index', { ascending: true });

        if (lessonsError) {
          throw lessonsError;
        }

        const currentLesson = allLevelLessons?.find(l => l.id === lessonId);
        const nextLesson = allLevelLessons?.find(l => l.order_index > (currentLesson?.order_index || 0));

        if (nextLesson) {
          console.log('📚 Next lesson found in group level:', nextLesson.id);
          
          // Débloquer et présenter la leçon suivante
          await unlockAndPresentNextLesson(studentId, nextLesson.id, nextLesson.title, effectiveFormationId, effectiveLevelId);
          
          return { 
            progressionUpdate: 'next_lesson',
            nextLessonId: nextLesson.id 
          };
        }

        // 7. Si c'était la dernière leçon du niveau, débloquer le niveau suivant
        console.log('🏆 Group level completed, checking for next level...');
        await handleLevelCompletion(studentId, effectiveFormationId, effectiveLevelId);

        return { progressionUpdate: 'level_completed' };

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

      if (data.progressionUpdate === 'next_exercise') {
        toast.success('Exercice validé ! Prochain exercice débloqué.');
      } else if (data.progressionUpdate === 'next_lesson') {
        toast.success('Leçon terminée ! Leçon suivante débloquée.');
      } else if (data.progressionUpdate === 'level_completed') {
        toast.success('Félicitations ! Niveau terminé !');
      } else {
        toast.success('Exercice validé avec succès !');
      }
    },
    onError: (error) => {
      console.error('Error validating group exercise:', error);
      toast.error('Erreur lors de la validation de l\'exercice');
    },
  });
};

// Fonction utilitaire pour présenter le prochain exercice
async function presentNextExerciseToStudent(
  studentId: string,
  exerciseId: string,
  lessonId: string,
  formationId: string,
  levelId: string
) {
  const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';

  // Récupérer les détails de l'exercice
  const { data: exercise } = await supabase
    .from('exercises')
    .select('title, description, content')
    .eq('id', exerciseId)
    .single();

  if (!exercise) return;

  // Créer le message système de présentation
  await supabase
    .from('lesson_messages')
    .insert({
      lesson_id: lessonId,
      formation_id: formationId,
      level_id: levelId,
      receiver_id: studentId,
      sender_id: SYSTEM_USER_ID,
      content: `✅ Bien joué ! Voici ton prochain exercice : **${exercise.title}**\n\n${exercise.description || ''}\n\n${exercise.content || ''}`,
      message_type: 'system',
      is_system_message: true,
      exercise_id: exerciseId
    });
}

// Fonction utilitaire pour débloquer et présenter la leçon suivante
async function unlockAndPresentNextLesson(
  studentId: string,
  nextLessonId: string,
  lessonTitle: string,
  formationId: string,
  levelId: string
) {
  const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';

  // Débloquer la leçon suivante
  await supabase
    .from('user_lesson_progress')
    .upsert({
      user_id: studentId,
      lesson_id: nextLessonId,
      level_id: levelId,
      status: 'not_started',
      exercise_completed: false,
      create_at: new Date().toISOString()
    });

  // Récupérer le premier exercice de la nouvelle leçon
  const { data: firstExercise } = await supabase
    .from('exercises')
    .select('id, title, description, content')
    .eq('lesson_id', nextLessonId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  // Message de félicitation et présentation de la nouvelle leçon
  if (firstExercise) {
    await supabase
      .from('lesson_messages')
      .insert({
        lesson_id: nextLessonId,
        formation_id: formationId,
        level_id: levelId,
        receiver_id: studentId,
        sender_id: SYSTEM_USER_ID,
        content: `🎉 Félicitations ! Vous avez terminé la leçon précédente.\n\n📚 **Nouvelle leçon débloquée :** ${lessonTitle}\n\nVoici votre premier exercice : **${firstExercise.title}**\n\n${firstExercise.description || ''}\n\n${firstExercise.content || ''}`,
        message_type: 'system',
        is_system_message: true,
        exercise_id: firstExercise.id
      });
  }
}

// Fonction utilitaire pour gérer la fin du niveau
async function handleLevelCompletion(
  studentId: string,
  formationId: string,
  currentLevelId: string
) {
  // Récupérer le niveau suivant
  const { data: allLevels } = await supabase
    .from('levels')
    .select('id, order_index, title')
    .eq('formation_id', formationId)
    .order('order_index', { ascending: true });

  const currentLevel = allLevels?.find(l => l.id === currentLevelId);
  const nextLevel = allLevels?.find(l => l.order_index > (currentLevel?.order_index || 0));

  if (nextLevel) {
    // Créer notification pour déblocage du niveau suivant
    await supabase
      .from('notifications')
      .insert({
        user_id: studentId,
        title: 'Nouveau niveau débloqué !',
        message: `Félicitations ! Vous avez débloqué le niveau "${nextLevel.title}". Vous pouvez maintenant accéder au chat de groupe de ce niveau.`,
        type: 'success',
        formation_id: formationId
      });