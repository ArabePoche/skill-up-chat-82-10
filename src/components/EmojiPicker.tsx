
import React, { useEffect, useRef, useState } from 'react';
import { Smile, Sticker } from 'lucide-react';
import StickerPicker from './chat/StickerPicker';
import EmojiPickerLib from 'emoji-picker-react';
import { EmojiStyle, Theme } from 'emoji-picker-react';
import { useFavorites } from '@/hooks/useFavorites';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect?: (sticker: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onStickerSelect, isOpen, onToggle, className }) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
  const pickerRef = useRef<HTMLDivElement>(null);
  const { toggleFavorite, isFavorited } = useFavorites();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggle();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onToggle]);

  if (!isOpen) return null;

  const handleEmojiSelect = (emojiObject: any) => {
    const emoji = emojiObject.emoji;
    onEmojiSelect(emoji);
    onToggle();
  };

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Sélecteur d'emojis et stickers"
      className={`w-[90vw] max-w-[380px] sm:w-[380px] max-h-[70vh] z-50 flex flex-col bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 animate-in fade-in zoom-in-95 duration-200 ${className !== undefined ? className : 'absolute bottom-full left-0 mb-3'}`}
    >
      {/* Tab switcher: Emojis vs Stickers */}
      <div className="flex border-b border-gray-100/80 bg-white/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setActiveTab('emoji')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all duration-200 ${
            activeTab === 'emoji'
              ? 'text-violet-600 border-b-2 border-violet-500 bg-gradient-to-b from-violet-50/60 to-violet-50/30'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Smile size={16} className="transition-transform group-hover:scale-110" />
          <span>Emojis</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sticker')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all duration-200 ${
            activeTab === 'sticker'
              ? 'text-violet-600 border-b-2 border-violet-500 bg-gradient-to-b from-violet-50/60 to-violet-50/30'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Sticker size={16} className="transition-transform group-hover:scale-110" />
          <span>Stickers</span>
        </button>
      </div>


      {activeTab === 'sticker' ? (
        <StickerPicker
          isOpen={true}
          onToggle={onToggle}
          onStickerSelect={(sticker) => {
            onStickerSelect?.(sticker);
          }}
          className="relative rounded-none shadow-none border-0 w-full max-w-none"
        />
      ) : (
        <div className="flex-1 overflow-hidden max-h-[50vh]">
          <EmojiPickerLib
            onEmojiClick={(emojiObject) => {
              handleEmojiSelect(emojiObject);
              // Ajouter automatiquement aux favoris récents
              if (!isFavorited('emoji', emojiObject.emoji)) {
                toggleFavorite('emoji', emojiObject.emoji, {
                  name: emojiObject.names?.[0] || 'Emoji',
                  category: emojiObject.category,
                });
              }
            }}
            emojiStyle={EmojiStyle.NATIVE}
            theme={Theme.LIGHT}
            width="100%"
            height="100%"
            previewConfig={{
              showPreview: true,
              defaultCaption: 'Choisissez un emoji',
              defaultEmoji: '😊'
            }}
            searchPlaceholder="Rechercher un emoji..."
            categories={{
              smileys_people: {
                name: 'Sourires et Personnes',
                category: ['smileys_people']
              },
              animals_nature: {
                name: 'Animaux et Nature',
                category: ['animals_nature']
              },
              food_drink: {
                name: 'Nourriture et Boissons',
                category: ['food_drink']
              },
              activities: {
                name: 'Activités',
                category: ['activities']
              },
              travel_places: {
                name: 'Voyages et Lieux',
                category: ['travel_places']
              },
              objects: {
                name: 'Objets',
                category: ['objects']
              },
              symbols: {
                name: 'Symboles',
                category: ['symbols']
              },
              flags: {
                name: 'Drapeaux',
                category: ['flags']
              }
            }}
            skinTonesDisabled={false}
            searchDisabled={false}
            stickySearch={true}
            emojiVersion="14.0"
            lazyLoadEmojis={true}
            autoFocusSearch={false}
            suggestedEmojisMode="recent"
            maxFrequentRows={2}
          />
        </div>
      )}
    </div>
  );
}
export default EmojiPicker;
