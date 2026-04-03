
import React, { useEffect, useRef, useState } from 'react';
import { Coffee, Flag, Heart, Music, Smile, Star, Sun, Car, X } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

type CategoryKey =
  | 'smileys'
  | 'emotions'
  | 'nature'
  | 'food'
  | 'transport'
  | 'flags'
  | 'music'
  | 'symbols';

type CategoryConfig = {
  icon: React.ComponentType<any>;
  label: string;
  accent: string;
  softAccent: string;
  emojis: string[];
};

const emojiCategories: Record<CategoryKey, CategoryConfig> = {
  smileys: {
    icon: Smile,
    label: 'Sourires',
    accent: 'text-amber-500',
    softAccent: 'bg-amber-50 border-amber-200 text-amber-700',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '🤔', '🤗', '🤫', '🫢', '🤕'],
  },
  emotions: {
    icon: Heart,
    label: 'Emotions',
    accent: 'text-rose-500',
    softAccent: 'bg-rose-50 border-rose-200 text-rose-700',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭'],
  },
  nature: {
    icon: Sun,
    label: 'Nature',
    accent: 'text-emerald-500',
    softAccent: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    emojis: ['🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '⭐', '🌟', '💫', '✨', '☄️', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄'],
  },
  food: {
    icon: Coffee,
    label: 'Food',
    accent: 'text-orange-500',
    softAccent: 'bg-orange-50 border-orange-200 text-orange-700',
    emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀'],
  },
  transport: {
    icon: Car,
    label: 'Transport',
    accent: 'text-sky-500',
    softAccent: 'bg-sky-50 border-sky-200 text-sky-700',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🚀', '🛰️', '💺', '🚢', '⛵', '🛶', '🚤'],
  },
  flags: {
    icon: Flag,
    label: 'Pays',
    accent: 'text-indigo-500',
    softAccent: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🇧🇫', '🏳️‍🌈', '🏳️‍⚧️', '🇬🇳', '🇫🇷', '🇺🇸', '🇬🇧', '🇩🇪', '🇪🇸', '🇮🇹', '🇯🇵', '🇨🇳', '🇲🇱', '🇨🇲', '🇰🇷', '🇷🇺', '🇧🇷', '🇨🇦', '🇦🇺', '🇮🇳', '🇲🇽', '🇳🇱', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱', '🇨🇭', '🇦🇹'],
  },
  music: {
    icon: Music,
    label: 'Musique',
    accent: 'text-fuchsia-500',
    softAccent: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
    emojis: ['🎵', '🎶', '🎼', '🎤', '🎧', '📻', '🎙️', '📢', '📣', '📯', '🔔', '🔕', '🎚️', '🎛️', '🎨', '🖌️', '🖍️', '🖊️', '🖋️', '✏️', '✒️', '🖇️', '📎', '🔗'],
  },
  symbols: {
    icon: Star,
    label: 'Symboles',
    accent: 'text-violet-500',
    softAccent: 'bg-violet-50 border-violet-200 text-violet-700',
    emojis: ['⭐', '🌟', '💫', '✨', '🔥', '💥', '💢', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '👍', '✍️', '🤝', '💪', '👆', '👇', '👏', '🤲', '🫶', '👂', '👀'],
  },
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, isOpen, onToggle }) => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('smileys');
  const pickerRef = useRef<HTMLDivElement>(null);
  const categoryEntries = Object.entries(emojiCategories) as Array<[CategoryKey, CategoryConfig]>;
  const activeCategoryConfig = emojiCategories[activeCategory];

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

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji.trim());
    onToggle();
  };

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Sélecteur d'emojis"
      className="w-full sm:w-[350px] z-50 flex flex-col bg-[#F0F2F5] dark:bg-[#111B21] rounded-lg shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Category Icons Row (Top Bar) */}
      <div className="flex items-center w-full px-2 py-1.5 bg-[#F0F2F5] dark:bg-[#111B21] border-b border-gray-200 dark:border-[#222E35]">
        {categoryEntries.map(([key, category]) => {
          const IconComponent = category.icon;
          const isActive = activeCategory === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`flex-1 flex justify-center py-2 relative transition-colors ${
                isActive ? 'text-[#008069] dark:text-[#00A884]' : 'text-[#54656F] dark:text-[#AEBAC1] hover:bg-black/5 dark:hover:bg-white/5 rounded-md'
              }`}
              title={category.label}
              aria-pressed={isActive}
            >
              <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} className="" />
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#008069] dark:bg-[#00A884]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Emoji Scroll Area */}
      <div className="flex-1 max-h-[300px] h-[300px] bg-white dark:bg-[#0B141A] overflow-y-auto px-2 py-3 custom-scrollbar">
        <h4 className="text-[14px] font-medium text-[#54656F] dark:text-[#8696A0] mb-3 px-2">
          {activeCategoryConfig.label}
        </h4>
        
        <div className="grid grid-cols-8 gap-0">
          {activeCategoryConfig.emojis.map((emoji, index) => (
             <button
              key={`${activeCategory}-${emoji}-${index}`}
              type="button"
              onClick={() => handleEmojiSelect(emoji)}
              className="flex h-10 w-9 sm:w-10 items-center justify-center text-[22px] transition hover:bg-[#F5F6F6] dark:hover:bg-[#202C33] rounded-md focus:outline-none focus:bg-[#EBEBEB] dark:focus:bg-[#2A3942]"
              title={emoji.trim()}
            >
              {emoji.trim()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
