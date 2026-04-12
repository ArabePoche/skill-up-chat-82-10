import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type FormationPublicMessageScope = 'specific_level' | 'all_levels';
export type FormationPublicMessageMediaType = 'audio' | 'video';

export interface FormationPublicMessageRecord {
  id: string;
  formation_id: string;
  level_id: string | null;
  author_id: string;
  scope: FormationPublicMessageScope;
  media_type: FormationPublicMessageMediaType;
  title: string | null;
  description: string | null;
  media_url: string;
  media_path: string | null;
  urgent: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormationPublicMessage extends FormationPublicMessageRecord {
  hasViewed: boolean;
  viewedAt: string | null;
}

interface UseFormationPublicMessagesOptions {
  formationId?: string;
  levelId?: string | null;
  enabled?: boolean;
}

const matchesLevel = (message: { scope: string; level_id: string | null }, levelId?: string | null) => {
  if (message.scope === 'all_levels') {
    return true;
  }

  if (!levelId) {
    return false;
  }

  return message.level_id === levelId;
};

export const useFormationPublicMessages = ({
  formationId,
  levelId,
  enabled = true,
}: UseFormationPublicMessagesOptions) => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['formation-public-messages', formationId, levelId, user?.id],
    enabled: enabled && !!formationId,
    queryFn: async (): Promise<FormationPublicMessage[]> => {
      if (!formationId) {
        return [];
      }

      const { data: messages, error } = await supabase
        .from('formation_public_messages')
        .select('*')
        .eq('formation_id', formationId)
        .eq('is_active', true)
        .order('urgent', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const relevantMessages = (messages ?? []).filter((message) => matchesLevel(message, levelId)) as unknown as FormationPublicMessageRecord[];

      if (!user?.id || relevantMessages.length === 0) {
        return relevantMessages.map((message) => ({
          ...message,
          hasViewed: false,
          viewedAt: null,
        }));
      }

      const { data: views, error: viewsError } = await supabase
        .from('formation_public_message_views')
        .select('message_id, completed_at')
        .eq('user_id', user.id)
        .in('message_id', relevantMessages.map((message) => message.id));

      if (viewsError) {
        throw viewsError;
      }

      const viewedMap = new Map((views ?? []).map((view) => [view.message_id, view.completed_at]));

      return relevantMessages.map((message) => ({
        ...message,
        hasViewed: viewedMap.has(message.id),
        viewedAt: viewedMap.get(message.id) ?? null,
      }));
    },
  });

  const messages = query.data ?? [];

  const pendingUrgentMessage = useMemo(
    () => messages.find((message) => message.urgent && !message.hasViewed) ?? null,
    [messages],
  );

  const bannerMessages = useMemo(
    () => messages.filter((message) => !message.urgent || message.hasViewed),
    [messages],
  );

  return {
    ...query,
    messages,
    bannerMessages,
    pendingUrgentMessage,
  };
};

export const useMarkFormationPublicMessageViewed = (formationId?: string, levelId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async (messageId: string) => {
      const queryPrefix = ['formation-public-messages', formationId] as const;

      await queryClient.cancelQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === queryPrefix[0] && queryKey[1] === queryPrefix[1];
        },
      });

      const previousEntries = queryClient.getQueriesData<FormationPublicMessage[]>({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === queryPrefix[0] && queryKey[1] === queryPrefix[1];
        },
      });

      const viewedAt = new Date().toISOString();

      queryClient.setQueriesData<FormationPublicMessage[]>(
        {
          predicate: (query) => {
            const queryKey = query.queryKey;
            return Array.isArray(queryKey) && queryKey[0] === queryPrefix[0] && queryKey[1] === queryPrefix[1];
          },
        },
        (currentMessages) => {
          if (!currentMessages) {
            return currentMessages;
          }

          return currentMessages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  hasViewed: true,
                  viewedAt,
                }
              : message,
          );
        },
      );

      return { previousEntries };
    },
    mutationFn: async (messageId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('formation_public_message_views')
        .upsert(
          {
            message_id: messageId,
            user_id: user.id,
            completed_at: new Date().toISOString(),
          },
          {
            onConflict: 'message_id,user_id',
          },
        );

      if (error) {
        throw error;
      }
    },
    onError: (_error, _messageId, context) => {
      for (const [queryKey, previousData] of context?.previousEntries ?? []) {
        queryClient.setQueryData(queryKey, previousData);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === 'formation-public-messages' && queryKey[1] === formationId;
        },
      });
    },
  });
};

export const useFormationPublicMessagesAdmin = (formationId?: string) => {
  return useQuery({
    queryKey: ['formation-public-messages-admin', formationId],
    enabled: !!formationId,
    queryFn: async (): Promise<FormationPublicMessageRecord[]> => {
      if (!formationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('formation_public_messages')
        .select('*')
        .eq('formation_id', formationId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as FormationPublicMessageRecord[];
    },
  });
};

export const useLessonLevelId = (lessonId?: string) => {
  return useQuery({
    queryKey: ['lesson-level-id', lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      if (!lessonId) {
        return null;
      }

      const { data, error } = await supabase
        .from('lessons')
        .select('level_id')
        .eq('id', lessonId)
        .single();

      if (error) {
        throw error;
      }

      return data?.level_id ?? null;
    },
  });
};