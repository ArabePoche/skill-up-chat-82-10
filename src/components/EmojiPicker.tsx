
import React, { useEffect, useRef, useState } from 'react';
import { Coffee, Flag, Heart, Music, Smile, Star, Sun, Car, X } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

type CategoryKey =
  | 'smileys'
  | 'emotions'
  | 'islam'
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
  islam: {
    icon: Star,
    label: 'Islam',
    accent: 'text-emerald-600',
    softAccent: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    emojis: ['🤲', '🕌', '☪️', '📿', '🕋', '🌙', '⭐', '🛐', '🤍', '💚', '🕊️', '☝️', '📖', '✨', '﷽', 'ﷺ', 'آمين', 'الحمد لله', 'إن شاء الله', 'ما شاء الله', 'سبحان الله'],
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

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, isOpen, onToggle, className }) => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('smileys');
  const pickerRef = useRef<HTMLDivElement>(null);
  const categoryEntries = Object.entries(emojiCategories) as Array<[CategoryKey, CategoryConfig]>;
  const activeCategoryConfig = emojiCategories[activeCategory];

  const isTextEntry = (value: string) => value.length > 3 || /[\u0600-\u06FF]/.test(value);

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
      className={`w-[85vw] max-w-[340px] sm:w-[350px] z-50 flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 ${className !== undefined ? className : 'absolute bottom-full left-0 mb-3'}`}
    >
      {/* Search Output & Header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {activeCategoryConfig.label}
        </div>
        
        {/* Category Icons Row (Top Bar) */}
        <div className="flex items-center justify-between w-full">
          {categoryEntries.map(([key, category]) => {
            const IconComponent = category.icon;
            const isActive = activeCategory === key;

            return (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCategory(key);
                }}
                className={`p-1.5 transition-all duration-200 rounded-xl relative ${
                  isActive 
                    ? `bg-violet-100 text-violet-600 scale-110 shadow-sm` 
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }`}
                title={category.label}
                aria-pressed={isActive}
              >
                <IconComponent size={18} strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Emoji Scroll Area */}
      <div className="flex-1 max-h-[280px] h-[280px] overflow-y-auto px-3 py-3 custom-scrollbar scroll-smooth">
        <div className="grid grid-cols-7 sm:grid-cols-8 gap-y-3 gap-x-1 justify-items-center">
          {activeCategoryConfig.emojis.map((emoji, index) => {
            const isText = isTextEntry(emoji);
            return (
               <button
                key={`${activeCategory}-${emoji}-${index}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmojiSelect(emoji);
                }}
                className={isText
                  ? `col-span-4 flex min-h-[36px] w-full items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 rounded-xl border border-transparent hover:border-violet-100 hover:bg-violet-50 hover:text-violet-700 hover:shadow-sm active:scale-95 ${emoji.length > 5 ? 'text-[11px]' : ''}`
                  : 'flex h-9 w-9 items-center justify-center text-[22px] transition-all duration-200 rounded-xl hover:bg-slate-100 hover:scale-125 focus:outline-none focus:bg-violet-50 focus:scale-125 active:scale-95'}
                title={emoji.trim()}
                dir={/[\u0600-\u06FF]/.test(emoji) ? 'rtl' : undefined}
              >
                {emoji.trim()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
