import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type FavoriteType = 'emoji' | 'sticker';

export interface Favorite {
  id: string;
  user_id: string;
  item_type: FavoriteType;
  item_id: string;
  item_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey: ['emoji_sticker_favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_emoji_sticker_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!user?.id,
  });

  const addFavorite = useMutation({
    mutationFn: async ({ type, itemId, itemData }: { 
      type: FavoriteType; 
      itemId: string; 
      itemData?: Record<string, any> 
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_emoji_sticker_favorites')
        .insert({
          user_id: user.id,
          item_type: type,
          item_id: itemId,
          item_data: itemData || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Favorite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji_sticker_favorites', user?.id] });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async ({ type, itemId }: { type: FavoriteType; itemId: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_emoji_sticker_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', type)
        .eq('item_id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji_sticker_favorites', user?.id] });
    },
  });

  const toggleFavorite = (type: FavoriteType, itemId: string, itemData?: Record<string, any>) => {
    const isFavorited = favorites.some(
      fav => fav.item_type === type && fav.item_id === itemId
    );

    if (isFavorited) {
      removeFavorite.mutate({ type, itemId });
    } else {
      addFavorite.mutate({ type, itemId, itemData });
    }
  };

  const isFavorited = (type: FavoriteType, itemId: string) => {
    return favorites.some(fav => fav.item_type === type && fav.item_id === itemId);
  };

  const getFavoriteEmojis = () => {
    return favorites.filter(fav => fav.item_type === 'emoji');
  };

  const getFavoriteStickers = () => {
    return favorites.filter(fav => fav.item_type === 'sticker');
  };

  return {
    favorites,
    isLoading,
    error,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorited,
    getFavoriteEmojis,
    getFavoriteStickers,
  };
}
