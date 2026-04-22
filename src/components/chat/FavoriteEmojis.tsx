import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteEmojisProps {
  onEmojiSelect: (emoji: string) => void;
}

const FavoriteEmojis: React.FC<FavoriteEmojisProps> = ({ onEmojiSelect }) => {
  const { getFavoriteEmojis, isFavorited, toggleFavorite, isLoading } = useFavorites();
  const favoriteEmojis = getFavoriteEmojis();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (favoriteEmojis.length === 0) {
    return (
      <div className="text-center py-4 text-slate-400 text-sm">
        <Heart size={20} className="mx-auto mb-2 opacity-50" />
        <p>Aucun emoji favori</p>
        <p className="text-xs mt-1">Cliquez sur ❤️ pour ajouter aux favoris</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Heart size={16} className="text-rose-500 fill-current" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Emojis Favoris
        </span>
      </div>
      <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
        {favoriteEmojis.map((favorite) => (
          <button
            key={favorite.id}
            type="button"
            onClick={() => onEmojiSelect(favorite.item_id)}
            className="flex h-8 w-8 items-center justify-center text-[18px] rounded-lg hover:bg-slate-100 hover:scale-110 transition-all duration-200 border border-transparent hover:border-rose-200 group relative"
            title={favorite.item_id}
          >
            <span>{favorite.item_id}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite('emoji', favorite.item_id);
              }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-rose-600"
              title="Retirer des favoris"
            >
              <Heart size={10} className="fill-current" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FavoriteEmojis;
