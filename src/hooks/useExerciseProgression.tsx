
import { useEffect, useState } from 'react';

interface Exercise {
  id: string;
  title: string;
  description?: string;
  content?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_exercise_submission?: boolean;
  exercise_status?: string;
  exercise_id?: string;
  is_system_message?: boolean;
}

export const useExerciseProgression = (exercises: Exercise[], messages: Message[]) => {
  const [visibleExercises, setVisibleExercises] = useState<Exercise[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);

  useEffect(() => {
    if (!exercises || exercises.length === 0) {
      setVisibleExercises([]);
      setAllCompleted(false);
      return;
    }

    console.log('Processing exercise progression with:', {
      exercisesCount: exercises.length,
      messagesCount: messages.length
    });

    // Identifier les exercices qui ont été présentés via des messages système
    const presentedExerciseIds = messages
      .filter(msg => msg.is_system_message && msg.exercise_id)
      .map(msg => msg.exercise_id)
      .filter(Boolean) as string[];

    // Identifier les exercices approuvés
    const approvedExerciseIds = messages
      .filter(msg => 
        msg.is_exercise_submission && 
        msg.exercise_status === 'approved' &&
        msg.exercise_id
      )
      .map(msg => msg.exercise_id)
      .filter(Boolean) as string[];

    console.log('Exercise progression analysis:', {
      presentedExerciseIds,
      approvedExerciseIds
    });

    // Les exercices visibles sont ceux qui ont été présentés dans les messages système
    const exercisesToShow = exercises.filter(exercise => 
      presentedExerciseIds.includes(exercise.id)
    );

    // S'il n'y a pas d'exercices présentés, montrer au moins le premier
    if (exercisesToShow.length === 0 && exercises.length > 0) {
      exercisesToShow.push(exercises[0]);
    }

    setVisibleExercises(exercisesToShow);
    setAllCompleted(approvedExerciseIds.length >= exercises.length && exercises.length > 0);

    console.log('Exercise progression result:', {
      visibleExercises: exercisesToShow.length,
      allCompleted: approvedExerciseIds.length >= exercises.length && exercises.length > 0,
      approvedCount: approvedExerciseIds.length,
      totalExercises: exercises.length
    });
  }, [exercises, messages]);

  return {
    visibleExercises,
    allCompleted,
    progressPercentage: exercises.length > 0 ? (visibleExercises.length / exercises.length) * 100 : 0
  };
};
