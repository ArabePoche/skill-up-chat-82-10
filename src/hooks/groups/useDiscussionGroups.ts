import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  getDiscussionEventPreview,
  isDiscussionEventContent,
} from '@/utils/discussionEvents';

/**
 * Hook pour charger les groupes de discussion auxquels l'utilisateur appartient.
 *
 * Pour chaque groupe, le hook :
 *   - récupère le dernier message envoyé (texte, média ou événement système)
 *   - traduit les signaux `__GROUP_EVENT__:...` en aperçu lisible
 *   - écoute en temps réel les nouveaux messages pour rafraîchir la liste
 *     (date + aperçu du dernier message à jour instantanément)
 */
export const useDiscussionGroups = (enabled: boolean = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime : tout nouveau message ou suppression dans n'importe quel groupe
  // déclenche un rafraîchissement de la liste pour mettre à jour l'aperçu.
  useEffect(() => {
    if (!enabled || !user?.id) return;

    const channel = supabase
      .channel(`discussion-groups-list-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['discussion-groups', user.id] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['discussion-groups', user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, queryClient]);

  return useQuery({
    queryKey: ['discussion-groups', user?.id],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: groups } = await supabase
        .from('discussion_members')
        .select(`
          discussion_id,
          role,
          discussion_groups (
            id,
            name,
            description,
            avatar_url,
            group_type,
            member_count,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!groups || groups.length === 0) return [];

      const groupIds = groups
        .map((m: any) => m.discussion_groups?.id)
        .filter(Boolean) as string[];

      // Charger le dernier message par groupe.
      // On récupère les N derniers messages (toutes discussions de l'utilisateur
      // confondues), puis on garde le plus récent pour chacune côté client.
      const lastMessageByGroup = new Map<string, any>();
      if (groupIds.length > 0) {
        const { data: recentMessages } = await supabase
          .from('discussion_messages')
          .select('id, discussion_id, content, sender_id, created_at, message_type')
          .in('discussion_id', groupIds)
          .order('created_at', { ascending: false })
          .limit(Math.max(200, groupIds.length * 4));

        if (recentMessages) {
          for (const msg of recentMessages as any[]) {
            if (!lastMessageByGroup.has(msg.discussion_id)) {
              lastMessageByGroup.set(msg.discussion_id, msg);
            }
          }
        }
      }

      const buildPreview = (msg: any | undefined): string => {
        if (!msg) return '';
        const content = msg.content as string | null;

        // 1) Événement système → libellé lisible
        if (isDiscussionEventContent(content)) {
          return getDiscussionEventPreview(content) ?? 'Mise à jour du groupe';
        }

        // 2) Message texte
        if (content && content.trim().length > 0) {
          const trimmed = content.trim();
          return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
        }

        // 3) Message non textuel (média, audio, ...)
        const t = (msg.message_type as string | null)?.toUpperCase();
        switch (t) {
          case 'IMAGE':
            return '📷 Photo';
          case 'VIDEO':
            return '🎬 Vidéo';
          case 'AUDIO':
            return '🎙️ Message vocal';
          case 'FILE':
          case 'DOCUMENT':
            return '📎 Fichier';
          case 'STICKER':
            return 'Sticker';
          default:
            return '';
        }
      };

      const items = groups
        .map((member: any) => {
          const g = member.discussion_groups;
          if (!g) return null;
          const lastMsg = lastMessageByGroup.get(g.id);
          const lastDate = lastMsg?.created_at || g.updated_at || g.created_at;

          let timestamp = '';
          if (lastDate) {
            const date = new Date(lastDate);
            timestamp = date.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
          }

          return {
            id: `group-${g.id}`,
            groupId: g.id,
            name: g.name,
            description: g.description,
            avatar: g.avatar_url || '👥',
            type: 'group',
            role: member.role,
            memberCount: g.member_count,
            created_at: lastDate, // utilisé par la liste pour le tri
            updated_at: g.updated_at,
            lastMessage: buildPreview(lastMsg),
            lastMessageSenderId: lastMsg?.sender_id ?? null,
            timestamp,
          };
        })
        .filter(Boolean) as any[];

      // Tri du plus récent au plus ancien (même logique que les conversations privées)
      return items.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    },
    enabled: enabled && !!user?.id,
  });
};
