/**
 * Hook pour envoyer un exercice manuellement à un élève
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SendExerciseParams {
  formationId: string;
  studentId: string;
  lessonId: string;
  exerciseId: string;
  exerciseTitle: string;
}

export const useSendExerciseToStudent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      formationId,
      studentId,
      lessonId,
      exerciseId,
      exerciseTitle,
    }: SendExerciseParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Vérifier que l'utilisateur est bien professeur de cette formation
      const { data: teacherCheck } = await supabase
        .from('teachers')
        .select(`
          id,
          teacher_formations!inner (
            formation_id
          )
        `)
        .eq('user_id', user.id)
        .eq('teacher_formations.formation_id', formationId)
        .single();

      if (!teacherCheck) {
        throw new Error('User is not a teacher for this formation');
      }

      // Créer un message système avec l'exercice
      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          sender_id: user.id,
          receiver_id: studentId,
          content: `📝 Exercice envoyé : ${exerciseTitle}`,
          message_type: 'text',
          is_system_message: true,
          exercise_id: exerciseId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending exercise to student:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success('Exercice envoyé avec succès !');
      
      // Invalider les queries pour rafraîchir
      queryClient.invalidateQueries({
        queryKey: ['teacher-student-messages', data.formation_id, data.receiver_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['student-messages', data.lesson_id, data.formation_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['student-exercise-history', data.formation_id, data.receiver_id],
      });
    },
    onError: (error) => {
      console.error('Error sending exercise:', error);
      toast.error("Erreur lors de l'envoi de l'exercice");
    },
  });
};
