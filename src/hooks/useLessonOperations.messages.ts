import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEditLessonMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { data, error } = await (supabase as any)
        .from('lesson_messages')
        .update({ content })
        .eq('id', messageId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-messages', data.lesson_id, data.formation_id] });
      queryClient.invalidateQueries({ queryKey: ['teacher-messages', data.lesson_id, data.formation_id] });
    },
  });
};

export const useDeleteLessonMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string }) => {
      const { data, error } = await (supabase as any)
        .from('lesson_messages')
        .delete()
        .eq('id', messageId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    onSuccess: (_data, variables) => {
      // Invalider largement car DELETE n'est pas capté par notre abonnement realtime
      queryClient.invalidateQueries({ queryKey: ['student-messages'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-messages'] });
    },
  });
};