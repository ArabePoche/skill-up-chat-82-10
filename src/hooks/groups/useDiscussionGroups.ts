import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook pour charger les groupes de discussion auxquels l'utilisateur appartient
 */
export const useDiscussionGroups = (enabled: boolean = false) => {
  const { user } = useAuth();

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

      if (!groups) return [];

      return groups.map(member => ({
        id: `group-${member.discussion_groups.id}`,
        groupId: member.discussion_groups.id,
        name: member.discussion_groups.name,
        description: member.discussion_groups.description,
        avatar: member.discussion_groups.avatar_url || '👥',
        type: 'group',
        role: member.role,
        memberCount: member.discussion_groups.member_count,
        created_at: member.discussion_groups.created_at,
        updated_at: member.discussion_groups.updated_at,
      }));
    },
    enabled: enabled && !!user?.id,
  });
};
