import { useMutation, useQueryClient, Query } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEditLessonMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { data, error } = await (supabase as any)
        .from('lesson_messages')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalider les principales clés liées aux messages
      const keys = [
        ['lesson-messages', data.lesson_id, data.formation_id],
        ['student-messages', data.lesson_id, data.formation_id],
        ['teacher-messages', data.lesson_id, data.formation_id],
        ['teacher-student-messages', data.formation_id, data.sender_id, data.lesson_id],
        ['teacher-student-messages', data.formation_id, data.receiver_id, data.lesson_id],
      ] as const;
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key as any }));
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
    // Optimistic UI: retirer le message des caches avant la réponse serveur
    onMutate: async ({ messageId }) => {
      // Annuler toutes les requêtes "messages" en cours
      await queryClient.cancelQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.some((k) => typeof k === 'string' && k.includes('messages')) });

      // Sauvegarder les états précédents pour rollback
      const previous: Array<{ key: unknown[]; data: any }> = [];

      const queries = queryClient.getQueryCache().getAll().filter((q: any) =>
        Array.isArray(q.queryKey) && q.queryKey.some((k: any) => typeof k === 'string' && k.includes('messages'))
      );

      queries.forEach((q: any) => {
        const key = q.queryKey as unknown[];
        const data = queryClient.getQueryData<any>(key);
        previous.push({ key, data });
        if (Array.isArray(data)) {
          const filtered = data.filter((m: any) => m && m.id !== messageId);
          queryClient.setQueryData(key, filtered);
        }
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.previous) {
        context.previous.forEach((p: any) => queryClient.setQueryData(p.key, p.data));
      }
    },
    onSuccess: (data) => {
      // Invalider largement pour refetch propre
      const keysToInvalidate: any[] = [
        ['lesson-messages', data?.lesson_id, data?.formation_id],
        ['student-messages', data?.lesson_id, data?.formation_id],
        ['teacher-messages', data?.lesson_id, data?.formation_id],
        ['promotion-messages'],
        ['individual-messages'],
        ['teacher-student-messages'],
        ['teacher-group-messages'],
        ['group-chat-messages'],
      ];
      keysToInvalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: key as any }));
      // Réactions liées au message supprimé
      if (data?.id) queryClient.invalidateQueries({ queryKey: ['message-reactions', data.id] });
    },
    onSettled: () => {
      // Par sécurité, invalider toutes les clés "messages"
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.some((k) => typeof k === 'string' && k.includes('messages')) });
    }
  });
};