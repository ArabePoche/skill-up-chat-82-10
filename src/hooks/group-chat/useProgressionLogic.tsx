/**
 * Hook pour gérer la logique de progression séquentielle dans les groupes
 * Gère l'affichage progressif des exercices et le déblocage des leçons/niveaux
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useProgressionLogic = (formationId: string, levelId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Valider un exercice et gérer la progression
  const validateExercise = useMutation({
    mutationFn: async ({
      messageId,
      isValid,
      rejectReason,
      exerciseId,
      lessonId
    }: {
      messageId: string;
      isValid: boolean;
      rejectReason?: string;
      exerciseId: string;
      lessonId: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log('🔄 Validating exercise:', { messageId, isValid, exerciseId, lessonId });

      // 1. Mettre à jour le statut de l'exercice
      const { error: updateError } = await supabase
        .from('lesson_messages')
        .update({
          exercise_status: isValid ? 'approved' : 'rejected',
          content: rejectReason && !isValid ? `${rejectReason}` : undefined
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating exercise status:', updateError);
        throw updateError;
      }

      if (!isValid) {
        console.log('❌ Exercise rejected, no progression');
        return { progressionUpdate: null };
      }

      // 2. Si l'exercice est approuvé, vérifier la progression
      console.log('✅ Exercise approved, checking progression...');

      // Récupérer l'utilisateur qui a soumis l'exercice
      const { data: exerciseMessage, error: messageError } = await supabase
        .from('lesson_messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (messageError || !exerciseMessage) {
        console.error('Error fetching exercise message:', messageError);
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
        console.error('Error fetching lesson exercises:', exercisesError);
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
        console.error('Error fetching approved exercises:', approvedError);
        throw approvedError;
      }

      const approvedExerciseIds = new Set(approvedExercises?.map(e => e.exercise_id) || []);
      approvedExerciseIds.add(exerciseId); // Ajouter l'exercice qu'on vient d'approuver

      console.log('📊 Progression check:', {
        totalExercises: allLessonExercises?.length || 0,
        approvedExercises: approvedExerciseIds.size,
        allLessonExercises: allLessonExercises?.map(e => e.id),
        approvedIds: Array.from(approvedExerciseIds)
      });

      // 5. Vérifier s'il y a un prochain exercice à présenter
      const nextExercise = allLessonExercises?.find(ex => !approvedExerciseIds.has(ex.id));

      if (nextExercise) {
        console.log('📝 Next exercise found:', nextExercise.id);
        
        // Présenter le prochain exercice
        await presentExerciseToStudent(studentId, nextExercise.id, lessonId, formationId);
        
        return { 
          progressionUpdate: 'next_exercise',
          nextExerciseId: nextExercise.id 
        };
      }

      // 6. Si tous les exercices de la leçon sont terminés, débloquer la leçon suivante
      console.log('🎉 All lesson exercises completed, checking for next lesson...');

      // Récupérer toutes les leçons du niveau
      const { data: allLevelLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, order_index')
        .eq('level_id', levelId)
        .order('order_index', { ascending: true });

      if (lessonsError) {
        console.error('Error fetching level lessons:', lessonsError);
        throw lessonsError;
      }

      // Trouver la leçon suivante
      const currentLesson = allLevelLessons?.find(l => l.id === lessonId);
      const nextLesson = allLevelLessons?.find(l => l.order_index > (currentLesson?.order_index || 0));

      if (nextLesson) {
        console.log('📚 Next lesson found:', nextLesson.id);
        
        // Créer l'entrée de progression pour la leçon suivante
        await supabase
          .from('user_lesson_progress')
          .upsert({
            user_id: studentId,
            lesson_id: nextLesson.id,
            level_id: levelId,
            status: 'not_started',
            exercise_completed: false,
          }, { onConflict: 'user_id,lesson_id' });

        // Présenter la leçon suivante
        await presentLessonToStudent(studentId, nextLesson.id, formationId);
        
        return { 
          progressionUpdate: 'next_lesson',
          nextLessonId: nextLesson.id 
        };
      }

      // 7. Si c'était la dernière leçon du niveau, débloquer le niveau suivant
      console.log('🏆 Level completed, checking for next level...');

      const { data: allLevels, error: levelsError } = await supabase
        .from('levels')
        .select('id, order_index')
        .eq('formation_id', formationId)
        .order('order_index', { ascending: true });

      if (levelsError) {
        console.error('Error fetching formation levels:', levelsError);
        throw levelsError;
      }

      const currentLevel = allLevels?.find(l => l.id === levelId);
      const nextLevel = allLevels?.find(l => l.order_index > (currentLevel?.order_index || 0));

      if (nextLevel) {
        console.log('🎯 Next level found:', nextLevel.id);

        // Récupérer la première leçon du niveau suivant et créer la progression
        const { data: firstLessonOfNextLevel } = await supabase
          .from('lessons')
          .select('id')
          .eq('level_id', nextLevel.id)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstLessonOfNextLevel) {
          await supabase
            .from('user_lesson_progress')
            .upsert({
              user_id: studentId,
              lesson_id: firstLessonOfNextLevel.id,
              level_id: nextLevel.id,
              status: 'not_started',
              exercise_completed: false,
            }, { onConflict: 'user_id,lesson_id' });
        }
        
        // Envoyer notification de déblocage du niveau suivant
        await notifyLevelUnlocked(studentId, nextLevel.id, formationId);
        
        return { 
          progressionUpdate: 'next_level',
          nextLevelId: nextLevel.id 
        };
      }

      console.log('🎊 Formation completed!');
      return { progressionUpdate: 'formation_completed' };
    },
    onSuccess: (data) => {
      // Invalider les requêtes pour rafraîchir l'affichage
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['level-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-unlocking'] });
      queryClient.invalidateQueries({ queryKey: ['student-progression'] });
      queryClient.invalidateQueries({ queryKey: ['group-progression'] });
      queryClient.invalidateQueries({ queryKey: ['current-progression-status'] });
      
      if (data.progressionUpdate === 'next_exercise') {
        toast.success('Exercice validé ! Prochain exercice débloqué.');
      } else if (data.progressionUpdate === 'next_lesson') {
        toast.success('Leçon terminée ! Leçon suivante débloquée.');
      } else if (data.progressionUpdate === 'next_level') {
        toast.success('Niveau terminé ! Niveau suivant débloqué.');
      } else if (data.progressionUpdate === 'formation_completed') {
        toast.success('Félicitations ! Formation terminée !');
      }
    },
    onError: (error) => {
      console.error('Error validating exercise:', error);
      toast.error('Erreur lors de la validation de l\'exercice');
    },
  });

  return {
    validateExercise
  };
};

// Fonction pour présenter un exercice à un élève
async function presentExerciseToStudent(
  studentId: string, 
  exerciseId: string, 
  lessonId: string, 
  formationId: string
) {
  console.log('📝 Presenting exercise to student:', { studentId, exerciseId });

  // Récupérer les détails de l'exercice
  const { data: exercise, error: exerciseError } = await supabase
    .from('exercises')
    .select('title, description, content')
    .eq('id', exerciseId)
    .single();

  if (exerciseError || !exercise) {
    console.error('Error fetching exercise details:', exerciseError);
    return;
  }

  // Créer le message système de présentation de l'exercice
  const { error: messageError } = await supabase
    .from('lesson_messages')
    .insert({
      lesson_id: lessonId,
      formation_id: formationId,
      receiver_id: studentId,
      sender_id: studentId, // Message système mais assigné à l'utilisateur
      content: `📝 **Nouvel exercice débloqué :**\n\n**${exercise.title}**\n\n${exercise.description || ''}\n\n${exercise.content || ''}`,
      message_type: 'system',
      is_system_message: true,
      exercise_id: exerciseId
    });

  if (messageError) {
    console.error('Error creating exercise presentation message:', messageError);
  } else {
    console.log('✅ Exercise presented to student');
  }
}

// Fonction pour présenter une leçon à un élève
async function presentLessonToStudent(
  studentId: string, 
  lessonId: string, 
  formationId: string
) {
  console.log('📚 Presenting lesson to student:', { studentId, lessonId });

  // Récupérer les détails de la leçon
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('title, description')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    console.error('Error fetching lesson details:', lessonError);
    return;
  }

  // Créer le message système de présentation de la leçon
  const { error: messageError } = await supabase
    .from('lesson_messages')
    .insert({
      lesson_id: lessonId,
      formation_id: formationId,
      receiver_id: studentId,
      sender_id: studentId,
      content: `🎓 **Nouvelle leçon débloquée :**\n\n**${lesson.title}**\n\n${lesson.description || 'Vous pouvez maintenant commencer cette leçon.'}`,
      message_type: 'system',
      is_system_message: true
    });

  if (messageError) {
    console.error('Error creating lesson presentation message:', messageError);
  } else {
    console.log('✅ Lesson presented to student');
  }
}

// Fonction pour notifier le déblocage d'un niveau
async function notifyLevelUnlocked(
  studentId: string, 
  levelId: string, 
  formationId: string
) {
  console.log('🎯 Notifying level unlocked:', { studentId, levelId });

  // Récupérer les détails du niveau
  const { data: level, error: levelError } = await supabase
    .from('levels')
    .select('title, description')
    .eq('id', levelId)
    .single();

  if (levelError || !level) {
    console.error('Error fetching level details:', levelError);
    return;
  }

  // Créer une notification
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: studentId,
      title: 'Nouveau niveau débloqué !',
      message: `Félicitations ! Vous avez débloqué le niveau "${level.title}". Vous pouvez maintenant accéder au chat de groupe de ce niveau.`,
      type: 'success',
      formation_id: formationId
    });

  if (notificationError) {
    console.error('Error creating level unlock notification:', notificationError);
  } else {
    console.log('✅ Level unlock notification sent');
  }
}