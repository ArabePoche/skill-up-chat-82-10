import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useMarkLessonAsCompleted = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, formationId }: { lessonId: string | number; formationId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId.toString(),
          status: 'completed',
          exercise_completed: true,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' });

      if (error) throw error;
      
      return { lessonId, formationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-unlocking', data.formationId] });
      queryClient.invalidateQueries({ queryKey: ['user-progress', data.formationId] });
      queryClient.invalidateQueries({ queryKey: ['lessons', data.formationId] });
      // Invalidate specific lesson progress if used
    },
    onError: (error) => {
      console.error('Error marking lesson as completed:', error);
      toast.error("Erreur lors de la mise à jour de la progression");
    }
  });
};
